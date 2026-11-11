import type { MemoryPosterData } from "./memoryPoster";
import { MEMORY_PERSONAL_ICONS } from "./memoryIcons";

export const POSTER_WIDTH = 1080;
export const POSTER_BASE_HEIGHT = 1440;
export const MEMORY_BACKGROUND = "images/memory/encounter-background.webp";
const SERIF = "'Noto Serif SC', 'Songti SC', 'STSong', serif";
const HAND = "'Kaiti SC', 'STKaiti', 'KaiTi', 'Songti SC', serif";
const GOLD = "#e4bb70";
const RICE = "#f5e6c6";

async function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.onload = null; image.onerror = null; resolve(null); }, 12000);
    image.onload = () => { window.clearTimeout(timer); resolve(image); };
    image.onerror = () => { window.clearTimeout(timer); resolve(null); };
    image.src = src;
  });
}

export function layoutPosterLines(ctx: Pick<CanvasRenderingContext2D, "measureText">, text: string, width: number): string[] {
  return text.split("\n").flatMap((paragraph) => {
    const lines: string[] = []; let current = "";
    for (const char of paragraph) {
      // 标点跟随前一字，避免句读孤零零留在下一行。
      if (current && ctx.measureText(current + char).width > width && !/[，。！？、；：」）》]/.test(char)) {
        lines.push(current); current = char;
      } else current += char;
    }
    return [...lines, current];
  });
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
}
function rule(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, "#af7e39"); gradient.addColorStop(1, "rgba(175,126,57,.08)");
  ctx.strokeStyle = gradient; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + width, y); ctx.stroke();
}
function paper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x + 14, y + 5);
  for (let i = 1; i <= 22; i++) ctx.lineTo(x + (w - 22) * i / 22, y + 3 + Math.sin(i * 8.2) * 4);
  ctx.lineTo(x + w - 3, y + 15); ctx.lineTo(x + w, y + h - 12);
  for (let i = 0; i <= 22; i++) ctx.lineTo(x + w - 9 - (w - 20) * i / 22, y + h + Math.sin(i * 5.6) * 4);
  ctx.lineTo(x + 2, y + 18); ctx.closePath();
  ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, "#eed3a4"); gradient.addColorStop(.45, "#f5ddb1"); gradient.addColorStop(1, "#cfa16a");
  ctx.fillStyle = gradient; ctx.fill(); ctx.shadowColor = "transparent"; ctx.clip();
  for (let i = 0; i < 450; i++) {
    const px = x + ((i * 137.51) % w); const py = y + ((i * 97.3) % h);
    ctx.strokeStyle = i % 2 ? "rgba(112,66,25,.09)" : "rgba(255,245,218,.3)";
    ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 5 + (i % 16), py + (i % 5) - 2); ctx.stroke();
  }
  ctx.restore();
}
function icon(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = "#dca64f"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === 0) {
    ctx.moveTo(0, 18); ctx.bezierCurveTo(14, -1, 34, -1, 48, 18); ctx.bezierCurveTo(34, 37, 14, 37, 0, 18); ctx.stroke();
    ctx.beginPath(); ctx.arc(24, 18, 7, 0, Math.PI * 2);
  } else if (kind === 1) {
    ctx.roundRect(0, 0, 43, 31, 10); ctx.moveTo(10, 31); ctx.lineTo(7, 41); ctx.lineTo(22, 31); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(12 + i * 10, 15, 1.6, 0, Math.PI * 2); ctx.stroke(); }
  } else {
    ctx.moveTo(24, 6); ctx.bezierCurveTo(14, 0, 8, 0, 1, 3); ctx.lineTo(1, 34); ctx.quadraticCurveTo(13, 29, 24, 36);
    ctx.quadraticCurveTo(35, 29, 47, 34); ctx.lineTo(47, 3); ctx.quadraticCurveTo(34, -2, 24, 6); ctx.lineTo(24, 36);
  }
  ctx.stroke(); ctx.restore();
}
function paintLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}
function personalIcon(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number) {
  if (!image) return;
  const size = 32; const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale; const height = image.height * scale;
  ctx.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
}

/** 实际文字先量后画；长留言、四字笔迹和较长的发现不会挤到山景落款。 */
export function getPosterLayout(ctx: CanvasRenderingContext2D, data: MemoryPosterData, hasTraces: boolean) {
  ctx.font = `55px ${SERIF}`;
  let quoteFont = 55; let quote = layoutPosterLines(ctx, data.quote, 496);
  if (quote.length > 4) { quoteFont = 45; ctx.font = `45px ${SERIF}`; quote = layoutPosterLines(ctx, data.quote, 496); }
  const quoteBottom = 211 + (quote.length - 1) * 74;
  ctx.font = `28px ${SERIF}`;
  let discoveryFont = 28; let discovery = layoutPosterLines(ctx, data.discovery, 392);
  if (discovery.length > 6) { discoveryFont = 25; ctx.font = `25px ${SERIF}`; discovery = layoutPosterLines(ctx, data.discovery, 392); }
  const paperTop = Math.max(455, quoteBottom + 63);
  const paperHeight = Math.max(250, discovery.length * 39 + 83);
  const statsTop = Math.max(806, paperTop + paperHeight + 46);
  const personalTop = statsTop + 204;
  ctx.font = `34px ${HAND}`;
  const noteLines = data.legacyLine ? layoutPosterLines(ctx, data.legacyLine, hasTraces ? 580 : 880) : [];
  const personalHeight = Math.max(noteLines.length ? noteLines.length * 50 + 100 : 0, hasTraces ? (data.tracedGlyphs.length > 2 ? 340 : 240) : 0);
  return { quoteFont, quote, quoteBottom, discoveryFont, discovery, paperTop, paperHeight, statsTop, personalTop, noteLines, personalHeight,
    height: Math.max(POSTER_BASE_HEIGHT, personalTop + Math.max(personalHeight, 230) + 180) };
}

/** 与预览共用最终海报，导出中不包含编辑按钮、未完成的空白笔迹或示例数字。 */
export async function renderCard(data: MemoryPosterData): Promise<{ canvas: HTMLCanvasElement; personalTop: number }> {
  if (document.fonts?.load) {
    await Promise.race([Promise.all([document.fonts.load(`54px ${SERIF}`), document.fonts.load(`32px ${HAND}`)]).catch(() => {}), new Promise((resolve) => window.setTimeout(resolve, 2500))]);
  }
  const [background, subject, fallback, noteIcon, traceIcon, ...traces] = await Promise.all([
    loadImage(MEMORY_BACKGROUND), loadImage(data.subject), loadImage(data.fallbackSubject),
    loadImage(MEMORY_PERSONAL_ICONS.note), loadImage(MEMORY_PERSONAL_ICONS.trace),
    ...data.tracedGlyphs.map((glyph) => loadImage(glyph.src)),
  ]);
  const canvas = document.createElement("canvas"); canvas.width = POSTER_WIDTH;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("图片绘制暂不可用");
  const hasTraces = traces.some(Boolean);
  const { quoteFont, quote, quoteBottom, discoveryFont, discovery, paperTop, paperHeight, statsTop, personalTop, noteLines, personalHeight, height } = getPosterLayout(ctx, data, hasTraces);
  canvas.height = height;
  ctx.fillStyle = "#171008"; ctx.fillRect(0, 0, POSTER_WIDTH, height);
  if (background) ctx.drawImage(background, 0, 0, POSTER_WIDTH, height);
  else { ctx.strokeStyle = "#9c723d"; ctx.lineWidth = 2; rounded(ctx, 16, 16, 1048, height - 32, 28); ctx.stroke(); }

  ctx.fillStyle = RICE; ctx.font = `bold 50px ${HAND}`; ctx.fillText("物语千年", 72, 104);
  ctx.fillStyle = "#a63725"; rounded(ctx, 271, 56, 15, 29, 4); ctx.fill();
  ctx.fillStyle = "#f7d5ad"; ctx.font = `10px ${SERIF}`; ctx.fillText("物", 274, 68); ctx.fillText("语", 274, 80);
  rule(ctx, 310, 73, 1); ctx.fillStyle = RICE; ctx.font = `29px ${SERIF}`; ctx.fillText("我的千年相遇", 335, 97);
  ctx.font = `25px ${SERIF}`;
  const identityWidth = ctx.measureText(data.identity).width + 40;
  rounded(ctx, 1012 - identityWidth, 56, identityWidth, 48, 15); ctx.fillStyle = "rgba(25,17,9,.6)"; ctx.fill(); ctx.strokeStyle = "#926b39"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = RICE; ctx.fillText(data.identity, 1032 - identityWidth, 88);

  // 器物与句子并置，保留用户观察时的角度；无截图时使用项目已有器物素材。
  const portrait = subject ?? fallback;
  if (portrait) {
    const halo = ctx.createRadialGradient(778, 532, 10, 778, 532, 300);
    halo.addColorStop(0, "rgba(231,155,54,.20)"); halo.addColorStop(1, "rgba(231,155,54,0)");
    ctx.fillStyle = halo; ctx.fillRect(472, 200, 570, 570);
    const imageScale = Math.min(520 / portrait.width, 540 / portrait.height);
    const w = portrait.width * imageScale; const h = portrait.height * imageScale;
    ctx.save(); ctx.shadowColor = "rgba(218,157,65,.4)"; ctx.shadowBlur = 16;
    ctx.drawImage(portrait, 768 - w / 2, 755 - h, w, h); ctx.restore();
  }
  ctx.font = `${quoteFont}px ${SERIF}`;
  ctx.fillStyle = RICE; paintLines(ctx, quote, 78, 211, 74);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(82, quoteBottom + 38); ctx.quadraticCurveTo(217, quoteBottom + 9, 405, quoteBottom + 23); ctx.stroke();

  paper(ctx, 66, paperTop, 482, paperHeight);
  ctx.fillStyle = "#4e3019"; ctx.font = `bold 29px ${SERIF}`; ctx.fillText(data.discoveryLabel, 108, paperTop + 49);
  ctx.strokeStyle = "rgba(102,61,23,.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(108, paperTop + 63); ctx.lineTo(350, paperTop + 63); ctx.stroke();
  ctx.fillStyle = "#352211"; ctx.font = `${discoveryFont}px ${SERIF}`;
  paintLines(ctx, discovery, 108, paperTop + 108, 39);

  ctx.fillStyle = GOLD; ctx.font = `31px ${SERIF}`; ctx.fillText("我的探索足迹", 83, statsTop); rule(ctx, 310, statsTop - 11, 680);
  data.stats.forEach((stat, i) => {
    const x = 83 + i * 320; icon(ctx, i, x + 4, statsTop + 31);
    ctx.fillStyle = RICE; ctx.font = `51px ${SERIF}`; ctx.fillText(String(stat.count), x + 75, statsTop + 68);
    const numberWidth = ctx.measureText(String(stat.count)).width;
    ctx.font = `27px ${SERIF}`; ctx.fillText(stat.unit, x + 84 + numberWidth, statsTop + 64);
    ctx.fillStyle = "#c0a981"; ctx.font = `20px ${SERIF}`;
    paintLines(ctx, layoutPosterLines(ctx, stat.description, 232), x + 4, statsTop + 108, 28);
    if (i < 2) { ctx.strokeStyle = "rgba(188,141,73,.45)"; ctx.beginPath(); ctx.moveTo(x + 296, statsTop + 32); ctx.lineTo(x + 296, statsTop + 124); ctx.stroke(); }
  });
  rule(ctx, 68, statsTop + 151, 944);

  if (data.legacyLine) {
    personalIcon(ctx, noteIcon, 85, personalTop - 27);
    ctx.fillStyle = GOLD; ctx.font = `30px ${SERIF}`; ctx.fillText("我留下的话", 128, personalTop);
    if (hasTraces) paper(ctx, 78, personalTop + 28, 625, noteLines.length * 50 + 42);
    ctx.fillStyle = hasTraces ? "#402715" : RICE; ctx.font = `34px ${HAND}`;
    paintLines(ctx, noteLines, hasTraces ? 102 : 108, personalTop + 84, 50);
    ctx.strokeStyle = "#ae8043"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(260, personalTop + noteLines.length * 50 + 57); ctx.quadraticCurveTo(430, personalTop + noteLines.length * 50 + 38, hasTraces ? 655 : 860, personalTop + noteLines.length * 50 + 44); ctx.stroke();
  }
  if (hasTraces) {
    const startX = data.legacyLine ? 752 : 100;
    if (data.legacyLine) { ctx.strokeStyle = "rgba(188,141,73,.3)"; ctx.beginPath(); ctx.moveTo(726, personalTop - 22); ctx.lineTo(726, personalTop + personalHeight - 62); ctx.stroke(); }
    personalIcon(ctx, traceIcon, startX, personalTop - 27);
    ctx.fillStyle = GOLD; ctx.font = `30px ${SERIF}`; ctx.fillText("我的描红", startX + 40, personalTop);
    const tileSize = data.legacyLine ? (traces.length === 1 ? 190 : traces.length > 2 ? 105 : 116) : 145;
    traces.forEach((image, i) => {
      if (!image) return;
      const col = data.legacyLine ? i % 2 : i; const row = data.legacyLine ? Math.floor(i / 2) : 0;
      const x = startX + col * (tileSize + 12); const y = personalTop + 28 + row * (tileSize + 12);
      ctx.fillStyle = "#edd0a0"; rounded(ctx, x, y, tileSize, tileSize, 6); ctx.fill();
      ctx.strokeStyle = "#ac7840"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.drawImage(image, x + 4, y + 4, tileSize - 8, tileSize - 8);
    });
  }
  // 不导出空的编辑框；没有留言、笔迹时，山色本身就是留白。
  ctx.fillStyle = "#c4a578"; ctx.font = `18px ${SERIF}`; ctx.fillText(`${data.date} · 与${data.identity.split(" · ")[0]}相遇`, 76, height - 65);
  ctx.textAlign = "right"; ctx.fillStyle = GOLD; ctx.font = `28px ${HAND}`; ctx.fillText("物语千年 · 我的千年相遇", 1005, height - 65);
  return { canvas, personalTop };
}
