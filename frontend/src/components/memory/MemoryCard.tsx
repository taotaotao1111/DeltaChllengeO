import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore, type DiscoveredId } from "../../store/gameStore";
import { hezun } from "../../data/artifacts/hezun";

const DEFAULT_QUESTION = "如果你可以穿越回三千年前，你最想问何尊什么？";
const LEGACY_PROMPT = "如果三千年后，有人看到今天的你，你想留下什么？";

function getInsight(discovered: DiscoveredId[]): string {
  if (discovered.includes("hotspot-inscription")) {
    return "「宅兹中国」里的「中国」，指的是天下之中的都邑，并不是今天意义上的「中国」。";
  }
  if (discovered.includes("hotspot-form")) {
    return "何尊是一种「尊」——西周礼器中，用来盛酒、行礼的青铜器。";
  }
  if (discovered.includes("hotspot-pattern")) {
    return "何尊腹部的兽面纹，不只是装饰，也承载着那个时代的秩序与敬畏。";
  }
  if (discovered.includes("history")) {
    return "何尊的铸造，是为了让一段重要的嘱托被长久地记住。";
  }
  return "何尊已经三千多岁了，现在正站在你面前。";
}

export default function MemoryCard() {
  const open = useGameStore((s) => s.memoryCardOpen);
  const close = useGameStore((s) => s.closeMemoryCard);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const selectedLine = useGameStore((s) => s.selectedMemoryLine);
  const lastUserQuestion = useGameStore((s) => s.lastUserQuestion);
  const userLegacyLine = useGameStore((s) => s.userLegacyLine);
  const setUserLegacyLine = useGameStore((s) => s.setUserLegacyLine);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState("");

  const memoryLine = useMemo(() => selectedLine ?? hezun.memoryLines[0], [selectedLine]);
  const insight = useMemo(() => getInsight(discovered), [discovered]);
  const myQuestion = useMemo(() => lastUserQuestion() ?? DEFAULT_QUESTION, [lastUserQuestion]);
  const isPersonalQuestion = myQuestion !== DEFAULT_QUESTION;
  const hasLegacy = !!userLegacyLine;
  const needsPrompt = userLegacyLine === null;

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCard(canvas, {
      insight,
      memoryLine,
      myQuestion,
      isPersonalQuestion,
      legacyLine: userLegacyLine || null,
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "物语千年-我的千年相遇.png";
    a.click();
  };

  const submitLegacy = () => {
    setUserLegacyLine(draft.trim());
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-ink-900/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={needsPrompt ? undefined : close}
          />
          <motion.div
            className="fixed inset-0 z-[71] flex items-center justify-center p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))] sm:p-6"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.4 }}
          >
            {needsPrompt ? (
              <div className="w-full max-w-sm rounded-2xl border border-gilt/25 bg-ink-800/95 p-7 text-center shadow-2xl">
                <p className="text-xs tracking-widest text-gilt-light/60">在你离开之前</p>
                <p className="font-title mt-4 text-lg leading-relaxed text-rice-100">
                  {LEGACY_PROMPT}
                </p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="我希望……"
                  rows={3}
                  maxLength={80}
                  className="mt-5 w-full resize-none rounded-xl border border-rice-100/15 bg-ink-900/60 p-3 text-sm text-rice-100 outline-none placeholder:text-rice-200/30 focus:border-gilt/40"
                />
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={submitLegacy}
                    disabled={!draft.trim()}
                    className="flex-1 rounded-full bg-gilt/25 py-2.5 text-sm text-gilt-light transition hover:bg-gilt/35 disabled:opacity-30"
                  >
                    那我替你记住
                  </button>
                  <button
                    onClick={() => setUserLegacyLine("")}
                    className="rounded-full border border-rice-100/15 px-4 py-2.5 text-sm text-rice-200/60 transition hover:text-rice-100"
                  >
                    跳过
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gilt/25 bg-ink-800/95 shadow-2xl">
                <div className="scrollbar-none overflow-y-auto p-6 text-center sm:p-7">
                  <p className="font-title text-lg text-rice-100">我的千年相遇</p>
                  <p className="mt-1 text-sm text-rice-200/60">{hezun.name} · {hezun.dynasty}</p>

                  <div className="ink-divider my-5" />

                  <p className="text-xs text-rice-200/50">我今天知道了</p>
                  <p className="mt-2 text-[15px] leading-7 text-gilt-light">{insight}</p>

                  <div className="ink-divider my-5" />

                  <p className="text-xs text-rice-200/50">它让我印象最深的一句话</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-rice-100/85">
                    「{memoryLine}」
                  </p>

                  <div className="ink-divider my-5" />

                  <p className="text-xs text-rice-200/50">
                    {isPersonalQuestion ? "我问过它" : "我的问题"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-rice-100/70">{myQuestion}</p>

                  {hasLegacy && (
                    <>
                      <div className="ink-divider my-5" />
                      <p className="text-xs text-rice-200/50">我留下的话</p>
                      <p className="mt-2 text-xs italic text-gilt-light/70">「那我替你记住。」——何尊</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-rice-100/85">
                        「{userLegacyLine}」
                      </p>
                    </>
                  )}

                  <div className="ink-divider my-5" />

                  <p className="font-title text-sm text-rice-100/70">《物语千年》</p>
                  <p className="mt-1 text-[11px] tracking-wide text-rice-200/40">
                    闭馆以后，文物终于可以说话了。
                  </p>
                </div>

                <div className="flex shrink-0 gap-3 border-t border-rice-100/10 p-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 rounded-full bg-gilt/25 py-2.5 text-sm text-gilt-light transition hover:bg-gilt/35"
                  >
                    保存这张卡片
                  </button>
                  <button
                    onClick={close}
                    className="rounded-full border border-rice-100/15 px-5 py-2.5 text-sm text-rice-200/70 transition hover:text-rice-100"
                  >
                    收起
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} width={750} height={1260} className="hidden" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const paragraphs = text.split("\n");
  let cursorY = y;
  paragraphs.forEach((para) => {
    let line = "";
    for (const char of para) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = char;
        cursorY += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  });
  return cursorY;
}

function drawCard(
  canvas: HTMLCanvasElement,
  opts: {
    insight: string;
    memoryLine: string;
    myQuestion: string;
    isPersonalQuestion: boolean;
    legacyLine: string | null;
  },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#121214");
  bg.addColorStop(1, "#0a0a0c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(201,167,106,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f2ead9";
  ctx.font = "44px 'Noto Serif SC', serif";
  ctx.fillText("我的千年相遇", cx, 130);

  ctx.fillStyle = "rgba(242,234,217,0.6)";
  ctx.font = "24px 'Noto Sans SC', sans-serif";
  ctx.fillText("何尊 · 西周", cx, 172);

  let y = 230;
  y = section(ctx, cx, y, "我今天知道了", opts.insight, "#c9a76a", 22, W);

  y += 30;
  y = section(ctx, cx, y, "它让我印象最深的一句话", `「${opts.memoryLine}」`, "#f2ead9", 24, W);

  y += 30;
  y = section(ctx, cx, y, opts.isPersonalQuestion ? "我问过它" : "我的问题", opts.myQuestion, "#f2ead9", 22, W);

  if (opts.legacyLine) {
    y += 30;
    section(ctx, cx, y, "我留下的话（那我替你记住。——何尊）", `「${opts.legacyLine}」`, "#f2ead9", 22, W);
  }

  ctx.fillStyle = "#f2ead9";
  ctx.font = "24px 'Noto Serif SC', serif";
  ctx.fillText("《物语千年》", cx, H - 90);
  ctx.font = "18px 'Noto Sans SC', sans-serif";
  ctx.fillStyle = "rgba(242,234,217,0.5)";
  ctx.fillText("闭馆以后，文物终于可以说话了。", cx, H - 55);
}

function section(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  label: string,
  content: string,
  color: string,
  fontSize: number,
  totalWidth: number,
): number {
  ctx.fillStyle = "rgba(242,234,217,0.45)";
  ctx.font = "20px 'Noto Sans SC', sans-serif";
  ctx.fillText(label, cx, y);

  ctx.fillStyle = color;
  ctx.font = `${fontSize}px 'Noto Serif SC', serif`;
  const endY = wrapCanvasText(ctx, content, cx, y + 44, totalWidth - 160, fontSize + 14);

  line(ctx, cx, endY + 26, totalWidth - 140);
  return endY + 26;
}

function line(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number) {
  const grad = ctx.createLinearGradient(cx - width / 2, y, cx + width / 2, y);
  grad.addColorStop(0, "rgba(201,167,106,0)");
  grad.addColorStop(0.5, "rgba(201,167,106,0.5)");
  grad.addColorStop(1, "rgba(201,167,106,0)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();
}
