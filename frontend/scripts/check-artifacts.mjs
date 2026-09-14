/**
 * 文物档案自检。
 *
 * 挡的是一类"类型系统看不见、但会直接显示在屏幕上"的错误 —— 最典型的是
 * observe 章节的 firstLookResponses 漏了某个热点类型：用户点了那个热点，
 * 界面上就会出现一个 undefined。原来这件事只靠一行注释在提醒。
 *
 * 用法：cd frontend && node scripts/check-artifacts.mjs
 * 已挂进 npm run build 之前（见 package.json 的 prebuild）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "src/data/artifacts");

const problems = [];
const warnings = [];

/**
 * 不引入 ts 运行时，直接按文本做检查——档案是手写的字面量对象，
 * 用正则读取足够可靠，也省得为一个自检脚本装一套 TS 编译链。
 */
const files = fs
  .readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts");

for (const file of files) {
  const src = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
  const id = file.replace(/\.ts$/, "");

  // 1) 热点类型 → 第一眼回应 是否配齐
  const hotspotTypes = [...src.matchAll(/^\s+type:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const observeBlocks = [...src.matchAll(/firstLookResponses:\s*\{([\s\S]*?)\n\s{8}\}/g)];

  if (observeBlocks.length > 0) {
    const covered = new Set(
      [...observeBlocks[0][1].matchAll(/^\s*"?([\w-]+)"?:/gm)].map((m) => m[1]),
    );
    // 器身热点才需要（铭文与时间线不进观察章，见 ObserveModule 的排除法）
    const needed = hotspotTypes.filter((t) => t !== "inscription" && t !== "timeline");
    for (const t of needed) {
      if (!covered.has(t)) {
        problems.push(
          `${file}：热点类型 "${t}" 在 firstLookResponses 里没有对应文案 —— ` +
            `用户点这个热点会在界面上看到 undefined`,
        );
      }
    }
  }

  // 2) 授权信息还是占位的，提醒但不拦
  if (/license:\s*"[^"]*待确认/.test(src)) {
    warnings.push(`${file}：model.license 仍是「待确认」占位，正式发布前必须替换`);
  }

  // 3) 有没有未核实的史实
  const inferred = (src.match(/confidence:\s*"inferred"/g) || []).length;
  const verified = (src.match(/confidence:\s*"verified"/g) || []).length;
  if (inferred > 0 && verified === 0) {
    warnings.push(
      `${file}：${inferred} 条史实全部标为 inferred、没有一条 verified —— ` +
        `「${id}」的档案还没做过史料核对`,
    );
  }

  // 4) 注册表里登记过吗
  const index = fs.readFileSync(path.join(DATA_DIR, "index.ts"), "utf8");
  if (!index.includes(`from "./${id}"`)) {
    problems.push(`${file}：写了档案但没在 index.ts 的注册表里登记，界面上不会出现`);
  }
}

for (const w of warnings) console.log(`⚠️  ${w}`);
for (const p of problems) console.error(`❌ ${p}`);

if (problems.length > 0) {
  console.error(`\n档案自检未通过：${problems.length} 个问题`);
  process.exit(1);
}
console.log(`✅ 档案自检通过（${files.length} 件文物${warnings.length ? `，${warnings.length} 条待办` : ""}）`);
