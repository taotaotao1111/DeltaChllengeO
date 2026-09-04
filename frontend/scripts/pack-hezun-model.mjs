/**
 * 何尊 3D 模型资源打包脚本
 *
 * 原始扫描件有 96MB（85.8 万顶点 + 3 张共 55MB 的 PNG 贴图），无法直接上线。
 * 本脚本把它压到几 MB 级别，产物写到 frontend/public/models/hezun.glb。
 *
 * ⚠️ 原始素材放在**仓库外** `~/DeltaChallenge-assets/`（默认路径，可用环境变量
 * ASSETS_DIR 覆盖）。为什么不放仓库里：Cowork 的 `pack` 是整目录 copytree、
 * 只剥 node_modules/dist，**不看 .gitignore**，素材留在仓库里会让发布包变成 93MB
 * 并导致上传超时。
 *
 * 流程：
 *   1. 解出原始 glb 的 JSON / BIN 两个 chunk
 *   2. 把 3 张内嵌 PNG 贴图导出成临时文件，用 macOS 自带的 sips 缩放 + 转 JPEG
 *   3. 拼一个引用外部 .bin 与 .jpg 的中间态 .gltf（这样偏移量交给 gltfpack 处理，不用自己重排）
 *   4. gltfpack 做网格简化 + meshopt 压缩，输出最终 glb
 *
 * 为什么贴图不用 WebP / KTX2：npm 版 gltfpack 没编译进 WebP 与 BasisU 支持
 * （会直接报 "built without WebP support"），而 sips 只能写 JPEG 不能写 WebP。
 * JPEG 是 glTF 原生支持的格式，浏览器零成本解码，够用。
 *
 * 用法：cd frontend && node scripts/pack-hezun-model.mjs
 *   自定义素材目录：ASSETS_DIR=/path/to/assets node scripts/pack-hezun-model.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** 原始素材目录，在仓库外（见文件头说明） */
const ASSETS_DIR =
  process.env.ASSETS_DIR || path.join(os.homedir(), "DeltaChallenge-assets");
const SRC = path.join(ASSETS_DIR, "hezun.glb");
const OUT = path.join(ROOT, "public/models/hezun.glb");
const GLTFPACK = path.join(ROOT, "node_modules/.bin/gltfpack");

/** 网格简化目标三角面比例；0.18 约等于 27 万面，肉眼与原件无差 */
const SIMPLIFY_RATIO = "0.18";
/** 简化误差上限，0.005 = 允许 0.5% 形变 */
const SIMPLIFY_ERROR = "0.005";

/**
 * 各类贴图的压缩策略。
 * - basecolor：信息量最大，留 2048
 * - normal：JPEG 对法线方向敏感，质量给高一点
 * - metallicRoughness：粗糙度/金属度分别存在 G/B 通道，JPEG 色度抽样会伤到它们，
 *   所以降分辨率但提质量，视觉上影响最小
 */
const TEXTURE_RULES = [
  { match: /normal/i, maxSize: 2048, quality: 92, kind: "normal" },
  { match: /metallic|roughness/i, maxSize: 1024, quality: 90, kind: "metallicRoughness" },
  { match: /.*/, maxSize: 2048, quality: 82, kind: "baseColor" },
];

function fmtBytes(n) {
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 从 PNG 的 IHDR 里读出宽高，只为了打日志时看得清楚 */
function readPngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseGlb(file) {
  const fd = fs.openSync(file, "r");
  try {
    const header = Buffer.alloc(12);
    fs.readSync(fd, header, 0, 12, 0);
    if (header.toString("utf8", 0, 4) !== "glTF") {
      throw new Error(`${file} 不是合法的 glb 文件`);
    }

    let offset = 12;
    let json = null;
    let bin = null;

    while (offset < header.readUInt32LE(8)) {
      const chunkHeader = Buffer.alloc(8);
      fs.readSync(fd, chunkHeader, 0, 8, offset);
      const chunkLength = chunkHeader.readUInt32LE(0);
      const chunkType = chunkHeader.toString("utf8", 4, 8);
      const body = Buffer.alloc(chunkLength);
      fs.readSync(fd, body, 0, chunkLength, offset + 8);

      if (chunkType.startsWith("JSON")) json = JSON.parse(body.toString("utf8"));
      else if (chunkType.startsWith("BIN")) bin = body;

      offset += 8 + chunkLength;
    }

    if (!json || !bin) throw new Error("glb 缺少 JSON 或 BIN chunk");
    return { json, bin };
  } finally {
    fs.closeSync(fd);
  }
}

function sliceBufferView(json, bin, bufferViewIndex) {
  const view = json.bufferViews[bufferViewIndex];
  const start = view.byteOffset ?? 0;
  return bin.subarray(start, start + view.byteLength);
}

function main() {
  if (!fs.existsSync(SRC)) throw new Error(`找不到原始模型：${SRC}`);
  if (process.platform !== "darwin") {
    throw new Error("本脚本依赖 macOS 自带的 sips 转换贴图，请在 macOS 上运行");
  }

  console.log(`读取 ${path.relative(ROOT, SRC)}（${fmtBytes(fs.statSync(SRC).size)}）`);
  const { json, bin } = parseGlb(SRC);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "hezun-pack-"));
  console.log(`临时目录 ${workDir}`);

  // BIN chunk 整体落盘，作为中间态 gltf 的外部 buffer。
  // 里面包含已经不再需要的原始贴图字节，但这只是临时文件，gltfpack 只会带走真正引用到的数据。
  const binName = "hezun.bin";
  fs.writeFileSync(path.join(workDir, binName), bin);
  json.buffers = [{ byteLength: bin.length, uri: binName }];

  json.images = json.images.map((image, i) => {
    if (typeof image.bufferView !== "number") {
      throw new Error(`image[${i}] 不是内嵌贴图，脚本未覆盖这种情况`);
    }

    const rule = TEXTURE_RULES.find((r) => r.match.test(image.name ?? ""));
    const raw = sliceBufferView(json, bin, image.bufferView);
    const size = readPngSize(raw);

    const pngPath = path.join(workDir, `tex_${i}.png`);
    const jpgName = `tex_${i}.jpg`;
    const jpgPath = path.join(workDir, jpgName);
    fs.writeFileSync(pngPath, raw);

    execFileSync("sips", [
      "-Z", String(rule.maxSize),
      "-s", "format", "jpeg",
      "-s", "formatOptions", String(rule.quality),
      pngPath,
      "--out", jpgPath,
    ], { stdio: "ignore" });

    const after = fs.statSync(jpgPath).size;
    console.log(
      `  贴图 ${i} [${rule.kind}] ${size ? `${size.width}x${size.height}` : "?"} ` +
      `${fmtBytes(raw.length)} → ≤${rule.maxSize}px q${rule.quality} ${fmtBytes(after)}`,
    );

    return { name: image.name, uri: jpgName, mimeType: "image/jpeg" };
  });

  // 贴图已改为外部 uri，原先承载 PNG 字节的 bufferView 变成孤儿，gltfpack 会自行丢弃。
  const gltfPath = path.join(workDir, "hezun.gltf");
  fs.writeFileSync(gltfPath, JSON.stringify(json));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  console.log("运行 gltfpack…");
  const log = execFileSync(GLTFPACK, [
    "-i", gltfPath,
    "-o", OUT,
    "-cc",
    "-si", SIMPLIFY_RATIO,
    "-se", SIMPLIFY_ERROR,
    "-v",
  ], { encoding: "utf8" });
  console.log(log.trim().split("\n").map((l) => `  ${l}`).join("\n"));

  fs.rmSync(workDir, { recursive: true, force: true });
  console.log(`\n完成：${path.relative(ROOT, OUT)}　${fmtBytes(fs.statSync(OUT).size)}`);
}

main();
