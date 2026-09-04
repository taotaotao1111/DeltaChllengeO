/**
 * 临时验证脚本：用真实的 buildSystemPrompt + hezun.verifiedFacts，为一组问题
 * 各自生成分流后的 system prompt，输出 JSON 到 stdout，供护栏回归测试使用。
 * 不参与构建，可随时删除。
 *
 * 用法：node scripts/dump-system-prompt.mjs questions.json > prompts.json
 *   questions.json 形如 [["分类标签", "问题文本"], ...]
 */
import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const questionsFile = process.argv[2];
if (!questionsFile) throw new Error("需要传入 questions.json 路径");

const dir = mkdtempSync(join(tmpdir(), "prompt-"));
const entry = join(dir, "entry.ts");

writeFileSync(
  entry,
  `import { buildSystemPrompt, classifyQuestion } from "${process.cwd()}/src/utils/factGuard";
import { hezun } from "${process.cwd()}/src/data/artifacts/hezun";
import { readFileSync } from "node:fs";

const questions: [string, string][] = JSON.parse(readFileSync("${questionsFile}", "utf-8"));
const base = {
  artifact: hezun,
  verifiedFacts: hezun.verifiedFacts,
  discoveredDetails: ["铭文", "纹饰"],
  currentScene: "第一章·凝视",
  conversationHistory: [],
} as never;

const out = questions.map(([label, q]) => ({
  label,
  question: q,
  kind: classifyQuestion(q),
  prompt: buildSystemPrompt(base, q),
}));
process.stdout.write(JSON.stringify(out, null, 2));
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
