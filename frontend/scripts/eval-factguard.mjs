/**
 * 护栏评测集：factGuard 行为的可度量断言。
 *
 * 「护栏是护城河」不能只是形容词——这个脚本用一批带期望值的用例，
 * 断言四层行为并输出命中率报告：
 *   1. classifyQuestion 分流正确（general / experiential / persona）
 *   2. findRelevantFacts 检索命中（期望 factIds ⊆ 实际命中的 top3）
 *   3. buildSystemPrompt 约束段注入（【亲历边界】/【不作拟人化断言】按需出现）
 *   4. judgeFactBasis 依据档位（verified / inferred / unknown）
 *
 * 与 Mock / 真实后端无关：这四层是两条链路共享的确定性前置段
 * （回复文本由谁生成不影响判定口径，见 aiService.judgeFactBasis 注释）。
 *
 * 用法：npm run eval:guard（等价于 node scripts/eval-factguard.mjs scripts/factguard-cases.json）
 * 失败退出码 1。**不挂 build**——期望值需要人工校准，挂 build 会在校准期阻塞提交。
 *
 * 校准纪律：断言失败时先判断是护栏坏了还是用例写错了——判据是
 * factGuard 的设计意图（分流是为了避免答非所问；无据要承认不知道），
 * 不是「让测试变绿」。
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const casesFile = process.argv[2] ?? join(HERE, "factguard-cases.json");
const cases = JSON.parse(readFileSync(casesFile, "utf8"));

const dir = mkdtempSync(join(tmpdir(), "factguard-eval-"));
const entry = join(dir, "entry.ts");
const resultFile = join(dir, "result.json");

writeFileSync(
  entry,
  `import { writeFileSync } from "node:fs";
import { buildSystemPrompt, classifyQuestion, findRelevantFacts } from "${ROOT}/src/utils/factGuard";
import { judgeFactBasis } from "${ROOT}/src/services/aiService";
import { hezun } from "${ROOT}/src/data/artifacts/hezun";

const cases = ${JSON.stringify(cases)};
const base = {
  artifact: hezun,
  verifiedFacts: hezun.verifiedFacts,
  timeline: hezun.timeline,
  discoveredDetails: [],
  currentScene: "inscription",
  conversationHistory: [],
} as never;

const out = cases.map((c) => {
  const kind = classifyQuestion(c.question);
  const factIds = findRelevantFacts(c.question, hezun.verifiedFacts, 3).map((f) => f.id);
  const prompt = buildSystemPrompt(base, c.question);
  const basis = judgeFactBasis(c.question, base);
  return {
    id: c.id,
    question: c.question,
    kind,
    factIds,
    hasExperiential: prompt.includes("【亲历边界】"),
    hasPersona: prompt.includes("【不作拟人化断言】"),
    basis,
  };
});
writeFileSync("${resultFile}", JSON.stringify(out));
`,
);

const out = join(dir, "out.mjs");
await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  logLevel: "silent",
});
await import(out);

const results = JSON.parse(readFileSync(resultFile, "utf8"));

// ---------------- 断言与报告 ----------------
let pass = 0;
let fail = 0;
const kindStats = {}; // kind -> {pass, fail}
const dimStats = { kind: { p: 0, f: 0 }, facts: { p: 0, f: 0 }, sections: { p: 0, f: 0 }, basis: { p: 0, f: 0 } };

for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  const r = results[i];
  const errors = [];

  // 1) 分流
  (kindStats[r.kind] ??= { pass: 0, fail: 0 });
  if (r.kind !== c.expectKind) {
    errors.push(`kind: expect=${c.expectKind} actual=${r.kind}`);
    kindStats[r.kind].fail++;
    dimStats.kind.f++;
  } else {
    kindStats[r.kind].pass++;
    dimStats.kind.p++;
  }

  // 2) 检索命中（⊇ 语义）
  if (Array.isArray(c.expectFactIds)) {
    const ok = c.expectFactIds.every((id) => r.factIds.includes(id));
    if (!ok) {
      errors.push(`facts: expect⊇[${c.expectFactIds}] actual=[${r.factIds}]`);
      dimStats.facts.f++;
    } else {
      dimStats.facts.p++;
    }
  }

  // 3) 约束段注入
  if (c.expectSections) {
    if (c.expectSections.experiential !== undefined && r.hasExperiential !== c.expectSections.experiential) {
      errors.push(`section experiential: expect=${c.expectSections.experiential} actual=${r.hasExperiential}`);
      dimStats.sections.f++;
    } else if (c.expectSections.experiential !== undefined) dimStats.sections.p++;
    if (c.expectSections.persona !== undefined && r.hasPersona !== c.expectSections.persona) {
      errors.push(`section persona: expect=${c.expectSections.persona} actual=${r.hasPersona}`);
      dimStats.sections.f++;
    } else if (c.expectSections.persona !== undefined) dimStats.sections.p++;
  }

  // 4) 依据档位
  if (c.expectBasis) {
    if (r.basis !== c.expectBasis) {
      errors.push(`basis: expect=${c.expectBasis} actual=${r.basis}`);
      dimStats.basis.f++;
    } else {
      dimStats.basis.p++;
    }
  }

  if (errors.length === 0) {
    pass++;
    console.log(`[${c.id}] PASS  ${c.expectKind.padEnd(12)} ${r.factIds.slice(0, 2).join(",") || "-"}`);
  } else {
    fail++;
    console.log(`[${c.id}] FAIL  ${errors.join(" | ")}  ← ${c.question}`);
  }
}

console.log("\n───────── 护栏评测报告 ─────────");
for (const [kind, s] of Object.entries(kindStats)) {
  console.log(`分流 ${kind.padEnd(12)} ${s.pass}/${s.pass + s.fail}`);
}
console.log(
  `检索命中   ${dimStats.facts.p}/${dimStats.facts.p + dimStats.facts.f}`,
  ` 约束段命中 ${dimStats.sections.p}/${dimStats.sections.p + dimStats.sections.f}`,
  ` 依据档位 ${dimStats.basis.p}/${dimStats.basis.p + dimStats.basis.f}`,
);
const total = pass + fail;
console.log(`总计: ${pass}/${total} (${total ? ((pass / total) * 100).toFixed(1) : 0}%)`);

if (fail > 0) process.exit(1);
