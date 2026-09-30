/**
 * 口语问法探针：验证 QUERY_SYNONYMS 扩展后 findRelevantFacts 能命中
 * 「词面与事实零重叠」的问法。不进评测集（那些是断言口径），这里只是人工走查。
 */
import { build } from "esbuild";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const dir = mkdtempSync(join(tmpdir(), "colloq-"));
const entry = join(dir, "entry.ts");
const resultFile = join(dir, "result.json");

const probes = [
  { q: "谁做的你？", want: "fact-owner|fact-inscription-content" },
  { q: "谁造的你？", want: "fact-inscription-content|fact-owner" },
  { q: "你是谁做的？", want: "fact-owner|fact-inscription-content" },
  { q: "你多大？", want: "fact-size" },
  { q: "你多重？", want: "fact-size" },
  { q: "你几岁了？", want: "fact-date" },
  { q: "你多少岁了？", want: "fact-date" },
  { q: "你值多少钱？", want: "fact-scrap-sale" },
  { q: "你是从哪里来的？", want: "fact-discovery|fact-scrap-unearthed" },
  { q: "你从哪里挖出来的？", want: "fact-scrap-unearthed|fact-discovery" },
  { q: "你的主人是谁？", want: "fact-owner" },
  { q: "你叫什么名字？", want: "fact-owner" },
  { q: "你在什么地方？", want: "fact-status|fact-discovery" },
];

writeFileSync(
  entry,
  `import { writeFileSync } from "node:fs";
import { findRelevantFacts } from "${ROOT}/src/utils/factGuard";
import { hezun } from "${ROOT}/src/data/artifacts/hezun";
const probes = ${JSON.stringify(probes)};
const out = probes.map((p) => ({
  q: p.q,
  ids: findRelevantFacts(p.q, hezun.verifiedFacts, 2).map((f) => f.id),
}));
writeFileSync("${resultFile}", JSON.stringify(out));
`,
);

const out = join(dir, "out.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
await import(out);

const results = JSON.parse(readFileSync(resultFile, "utf8"));
let ok = 0;
for (let i = 0; i < probes.length; i++) {
  const wants = probes[i].want.split("|");
  const hit = wants.some((w) => results[i].ids.includes(w));
  if (hit) ok++;
  console.log(`${hit ? "PASS" : "MISS"}  ${probes[i].q}  → [${results[i].ids.join(", ")}]`);
}
console.log(`\n${ok}/${probes.length}`);
