/**
 * 记忆卡的图片导出。
 *
 * 从 MemoryCard.tsx 拆出来，一是因为 ESLint 的 react-refresh/only-export-components
 * 不允许组件文件导出非组件，二是绘制逻辑本身足够独立。
 *
 * 版式意图：一张卡只有一个主角——何尊留给你的那句话。截图与其余信息都是它的陪衬。
 */

export interface CardData {
  /** 何尊留下的主句，卡片的视觉主体 */
  memoryLine: string;
  /** 「我告诉过你」——本次体验解锁的那条史实 */
  insight: string;
  /** 这一段的小标题（问过 / 没问过时说法不同，由调用方决定） */
  questionLabel: string;
  /** 用户问过的问题；没问过时是何尊自己的一句临别话 */
  myQuestion: string;
  /** 用户留给三千年后的话，可能没有 */
  legacyLine: string | null;
  /** 用户在第一章转到的那个角度的截图（PNG dataURL），可能没有 */
  snapshot: string | null;
  /** 解锁的细节数量，用来落一句「你打开了 N 处细节」 */
  discoveredCount: number;
}

const W = 900;
const PAD = 72;

/**
 * 头部与尾部的版式常量。
 *
 * ⚠️ 这些必须被「量高度」和「真绘制」两条路径共用。最初两处各写了一套间距，
 * 结果无截图时头部只留 40px 而主句字号是 46px —— 标题和主句直接叠在一起。
 * 所以现在只保留一份，并由 headerBottom() 统一给出正文起始基线。
 */
const KICKER_Y = 104; // 「何尊 · 西周早期」基线
const TITLE_Y = 150; // 「这是我留给你的」基线
const SNAP_TOP = 180; // 截图顶边
const SNAP_SIZE = 420; // 截图边长
const SNAP_GAP_AFTER = 56; // 截图与正文之间
const TITLE_GAP_AFTER = 96; // 无截图时标题与正文之间（要容得下 46px 主句的字身）
const FOOTER_H = 200;

/** 正文第一行的基线位置；measure 与 renderCard 都用它，保证不再错位 */
function headerBottom(hasSnapshot: boolean): number {
  return hasSnapshot ? SNAP_TOP + SNAP_SIZE + SNAP_GAP_AFTER : TITLE_Y + TITLE_GAP_AFTER;
}

const COLOR_INK = "#0f0f11";
const COLOR_INK_DEEP = "#08080a";
const COLOR_RICE = "#f2ead9";
const COLOR_GILT = "#c9a76a";

/** 卡片里用到的字体族，显式带中文衬线兜底，避免 webfont 没加载时退成无衬线 */
const SERIF = "'Noto Serif SC', 'Songti SC', 'STSong', serif";
const SANS = "'Noto Sans SC', 'PingFang SC', sans-serif";

/**
 * 等字体真正可用后再绘制。
 *
 * canvas 的 ctx.font 遇到尚未加载完的 webfont **不会报错也不会等**，直接静默回退到
 * 系统默认字体——导出的图会和界面上看到的完全两样。而 Google Fonts 在内网还可能
 * 被拦，所以这里显式等一遍并容忍失败（失败就走上面的中文衬线兜底）。
 */
async function ensureFonts(): Promise<void> {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`64px ${SERIF}`),
      document.fonts.load(`26px ${SANS}`),
    ]);
    await document.fonts.ready;
  } catch {
    /* 用兜底字体继续画，不阻断导出 */
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 按字宽折行，返回每行文本（不绘制，用于先量高度再定画布尺寸） */
function layoutLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Block {
  label: string | null;
  lines: string[];
  lineHeight: number;
  font: string;
  color: string;
  /** 主句额外留白，强调它的主角地位 */
  gapBefore: number;
}

/**
 * 先量一遍所有文本块，算出总高度。
 *
 * 原实现把画布高度写死成 1260，而内容是变长的（留言最多 80 字、insight 和主句都可能
 * 多行），超出部分会被静默截掉。所以改成两趟：先量，再按实际高度建画布。
 */
function measure(ctx: CanvasRenderingContext2D, data: CardData): { blocks: Block[]; height: number } {
  const inner = W - PAD * 2;
  const blocks: Block[] = [];

  const push = (
    label: string | null,
    text: string,
    fontSize: number,
    font: string,
    color: string,
    gapBefore: number,
  ) => {
    ctx.font = `${fontSize}px ${font}`;
    blocks.push({
      label,
      lines: layoutLines(ctx, text, inner),
      lineHeight: Math.round(fontSize * 1.75),
      font: `${fontSize}px ${font}`,
      color,
      gapBefore,
    });
  };

  // 主角：何尊留下的那句话
  push(null, data.memoryLine, 46, SERIF, COLOR_RICE, 0);
  push("我告诉过你", data.insight, 26, SERIF, COLOR_GILT, 64);
  push(
    data.questionLabel,
    data.myQuestion,
    26,
    SERIF,
    "rgba(242,234,217,0.78)",
    52,
  );
  if (data.legacyLine) {
    push("你留给三千年后的话", `「${data.legacyLine}」`, 26, SERIF, "rgba(242,234,217,0.88)", 52);
  }

  let body = 0;
  for (const b of blocks) {
    body += b.gapBefore + (b.label ? 46 : 0) + b.lines.length * b.lineHeight;
  }

  return {
    blocks,
    height: Math.round(headerBottom(!!data.snapshot) + body + FOOTER_H),
  };
}

/**
 * 把记忆卡画到一个新建的 canvas 上并返回它。
 *
 * 调用方负责把它变成 dataURL / Blob——导出方式（下载 or 分享 or 长按保存）在
 * 不同平台差别很大，绘制这层不该关心。
 */
export async function renderCard(data: CardData): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const snapshotImg = data.snapshot ? await loadImage(data.snapshot) : null;

  // 先用一个临时上下文量高度
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("canvas 2d context 不可用");
  const { blocks, height } = measure(probe, { ...data, snapshot: snapshotImg ? data.snapshot : null });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context 不可用");

  // 背景：自上而下的墨色渐变
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, COLOR_INK);
  bg.addColorStop(1, COLOR_INK_DEEP);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, height);

  // 一条极细的金边，收住整张卡
  ctx.strokeStyle = "rgba(201,167,106,0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, height - 48);

  // ── 头部 ──────────────────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(242,234,217,0.4)";
  ctx.font = `22px ${SANS}`;
  ctx.fillText("何尊 · 西周早期", PAD, KICKER_Y);

  ctx.fillStyle = COLOR_RICE;
  ctx.font = `34px ${SERIF}`;
  ctx.fillText("这是我留给你的", PAD, TITLE_Y);

  // ── 截图：用户转到的那个角度 ───────────────────────────────────────
  if (snapshotImg) {
    const ix = (W - SNAP_SIZE) / 2;
    // 底部一圈暖晕，让透明底的器身不至于飘在渐变上
    const halo = ctx.createRadialGradient(
      W / 2,
      SNAP_TOP + SNAP_SIZE * 0.62,
      10,
      W / 2,
      SNAP_TOP + SNAP_SIZE * 0.62,
      SNAP_SIZE * 0.55,
    );
    halo.addColorStop(0, "rgba(201,167,106,0.16)");
    halo.addColorStop(1, "rgba(201,167,106,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(ix - 40, SNAP_TOP, SNAP_SIZE + 80, SNAP_SIZE + 40);
    ctx.drawImage(snapshotImg, ix, SNAP_TOP, SNAP_SIZE, SNAP_SIZE);
  }

  let y = headerBottom(!!snapshotImg);

  // ── 正文块 ────────────────────────────────────────────────────────
  for (const b of blocks) {
    y += b.gapBefore;
    if (b.label) {
      ctx.fillStyle = "rgba(201,167,106,0.55)";
      ctx.font = `20px ${SANS}`;
      ctx.fillText(b.label, PAD, y);
      y += 46;
    }
    ctx.fillStyle = b.color;
    ctx.font = b.font;
    for (const line of b.lines) {
      ctx.fillText(line, PAD, y);
      y += b.lineHeight;
    }
  }

  // ── 尾部：日期 + 痕迹 + 署名 ───────────────────────────────────────
  const footY = height - 132;
  const grad = ctx.createLinearGradient(PAD, footY, W - PAD, footY);
  grad.addColorStop(0, "rgba(201,167,106,0.45)");
  grad.addColorStop(1, "rgba(201,167,106,0)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footY);
  ctx.lineTo(W - PAD, footY);
  ctx.stroke();

  ctx.fillStyle = "rgba(242,234,217,0.45)";
  ctx.font = `20px ${SANS}`;
  ctx.fillText(
    `${formatToday()} · 你打开了我 ${data.discoveredCount} 处细节`,
    PAD,
    footY + 44,
  );

  ctx.fillStyle = "rgba(242,234,217,0.6)";
  ctx.font = `22px ${SERIF}`;
  ctx.fillText("《物语千年》 闭馆以后，文物终于可以说话了。", PAD, footY + 92);

  // 右下角一枚印章感的方印，和上面两行落款竖向居中对齐
  const seal = 70;
  const sx = W - PAD - seal;
  const sy = footY + 22;
  ctx.strokeStyle = "rgba(201,167,106,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, seal, seal);
  ctx.fillStyle = "rgba(201,167,106,0.8)";
  ctx.font = `26px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("何", sx + seal / 2, sy + seal * 0.3);
  ctx.fillText("尊", sx + seal / 2, sy + seal * 0.72);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  return canvas;
}

function formatToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
