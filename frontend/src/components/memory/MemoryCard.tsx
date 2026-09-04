import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore, type DiscoveredId } from "../../store/gameStore";
import { hezun } from "../../data/artifacts/hezun";
import { renderCard } from "./cardCanvas";

const DEFAULT_QUESTION = "如果你可以穿越回三千年前，你最想问何尊什么？";
const LEGACY_PROMPT = "如果三千年后，有人看到今天的你，你想留下什么？";

function getInsight(discovered: DiscoveredId[]): string {
  if (discovered.includes("hotspot-inscription")) {
    return "「宅兹中国」里的「中国」，指的是天下之中的都邑，并不是今天意义上的「中国」。";
  }
  if (discovered.includes("hotspot-form")) {
    return "我是一种「尊」——西周礼器中，用来盛酒、行礼的青铜器。";
  }
  if (discovered.includes("hotspot-pattern")) {
    return "我腹部的兽面纹，不只是装饰，也承载着那个时代的秩序与敬畏。";
  }
  if (discovered.includes("history")) {
    return "铸造我，是为了让一段重要的嘱托被长久地记住。";
  }
  return "我已经三千多岁了，此刻正站在你面前。";
}

function formatToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function MemoryCard() {
  const open = useGameStore((s) => s.memoryCardOpen);
  const close = useGameStore((s) => s.closeMemoryCard);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const selectedLine = useGameStore((s) => s.selectedMemoryLine);
  const lastUserQuestion = useGameStore((s) => s.lastUserQuestion);
  const userLegacyLine = useGameStore((s) => s.userLegacyLine);
  const setUserLegacyLine = useGameStore((s) => s.setUserLegacyLine);
  const snapshot = useGameStore((s) => s.artifactSnapshot);

  const [draft, setDraft] = useState("");
  /** 导出好的图片（dataURL）。非空时展示导出浮层，让用户长按保存或分享 */
  const [exported, setExported] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const memoryLine = useMemo(() => selectedLine ?? hezun.memoryLines[0], [selectedLine]);
  const insight = useMemo(() => getInsight(discovered), [discovered]);
  const myQuestion = useMemo(() => lastUserQuestion() ?? DEFAULT_QUESTION, [lastUserQuestion]);
  const isPersonalQuestion = myQuestion !== DEFAULT_QUESTION;
  const hasLegacy = !!userLegacyLine;
  const needsPrompt = userLegacyLine === null;

  /**
   * 生成图片。
   *
   * 这里**不再直接走 a.download**——iOS Safari 对 canvas 生成的 dataURL 不触发下载，
   * 而这个作品主要是在手机上看的，等于保存功能在主场景失效。改成把图渲出来放进浮层，
   * 用户长按即可存进相册；桌面端和安卓仍然提供下载按钮。
   */
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const canvas = await renderCard({
        memoryLine,
        insight,
        myQuestion,
        isPersonalQuestion,
        legacyLine: userLegacyLine || null,
        snapshot,
        discoveredCount: discovered.length,
      });
      setExported(canvas.toDataURL("image/png"));
    } catch (err) {
      console.warn("[MemoryCard] 生成卡片失败", err);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!exported) return;
    try {
      const blob = await (await fetch(exported)).blob();
      const file = new File([blob], "物语千年-我的千年相遇.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "我的千年相遇" });
      }
    } catch {
      /* 用户取消分享，不做处理 */
    }
  };

  const canShareFiles =
    typeof navigator !== "undefined" &&
    !!(navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }).canShare;

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
                    onClick={() => setUserLegacyLine(draft.trim())}
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
                <div className="scrollbar-none overflow-y-auto px-6 py-7 sm:px-7">
                  {/* 抬头：文物身份，小而轻 */}
                  <p className="text-[11px] tracking-widest text-rice-200/40">
                    {hezun.name} · {hezun.dynasty}
                  </p>
                  <p className="font-title mt-2 text-base text-rice-100/85">这是我留给你的</p>

                  {/* 用户转到的那个角度——每张卡都不一样 */}
                  {snapshot && (
                    <div className="relative mt-5 flex justify-center">
                      <div className="pointer-events-none absolute inset-x-6 bottom-2 h-16 rounded-full bg-gilt/10 blur-2xl" />
                      <img
                        src={snapshot}
                        alt="你看到的何尊"
                        className="relative h-40 w-40 object-contain"
                      />
                    </div>
                  )}

                  {/* 主角：何尊留下的那句话。整张卡只放大这一处 */}
                  <p className="font-title mt-6 whitespace-pre-line text-[22px] leading-[1.75] text-rice-100">
                    {memoryLine}
                  </p>

                  <div className="ink-divider my-6" />

                  <p className="text-[11px] tracking-widest text-gilt/60">我告诉过你</p>
                  <p className="mt-2 text-[13px] leading-7 text-gilt-light/90">{insight}</p>

                  <p className="mt-6 text-[11px] tracking-widest text-gilt/60">
                    {isPersonalQuestion ? "你问过我" : "你还没问我"}
                  </p>
                  <p className="mt-2 text-[13px] leading-7 text-rice-100/70">{myQuestion}</p>

                  {hasLegacy && (
                    <>
                      <p className="mt-6 text-[11px] tracking-widest text-gilt/60">
                        你留给三千年后的话
                      </p>
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-7 text-rice-100/85">
                        「{userLegacyLine}」
                      </p>
                      <p className="mt-2 text-[11px] italic text-gilt-light/50">
                        那我替你记住。
                      </p>
                    </>
                  )}

                  {/* 落款：日期 + 痕迹 + 方印 */}
                  <div className="ink-divider my-6" />
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] text-rice-200/40">
                        {formatToday()} · 你打开了我 {discovered.length} 处细节
                      </p>
                      <p className="font-title mt-2 text-[13px] text-rice-100/60">《物语千年》</p>
                      <p className="mt-1 text-[10px] tracking-wide text-rice-200/35">
                        闭馆以后，文物终于可以说话了。
                      </p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[3px] border border-gilt/45 text-[11px] leading-tight text-gilt/75">
                      <span>何</span>
                      <span>尊</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-3 border-t border-rice-100/10 p-4">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex-1 rounded-full bg-gilt/25 py-2.5 text-sm text-gilt-light transition hover:bg-gilt/35 disabled:opacity-40"
                  >
                    {exporting ? "正在生成…" : "保存这张卡片"}
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
          </motion.div>

          {/* 导出浮层：iOS 不支持 a.download，只能让用户长按图片存相册 */}
          <AnimatePresence>
            {exported && (
              <motion.div
                className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-ink-900/95 p-5 pt-[calc(1.25rem+var(--safe-top))] pb-[calc(1.25rem+var(--safe-bottom))]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-xs tracking-widest text-gilt-light/70">长按图片即可保存到相册</p>
                <img
                  src={exported}
                  alt="我的千年相遇"
                  className="max-h-[68vh] w-auto max-w-full rounded-xl border border-gilt/20"
                />
                <div className="flex gap-3">
                  {canShareFiles && (
                    <button
                      onClick={handleShare}
                      className="rounded-full bg-gilt/25 px-5 py-2.5 text-sm text-gilt-light transition hover:bg-gilt/35"
                    >
                      分享
                    </button>
                  )}
                  <a
                    href={exported}
                    download="物语千年-我的千年相遇.png"
                    className="rounded-full border border-gilt/30 px-5 py-2.5 text-sm text-gilt-light/90 transition hover:bg-gilt/15"
                  >
                    下载
                  </a>
                  <button
                    onClick={() => setExported(null)}
                    className="rounded-full border border-rice-100/15 px-5 py-2.5 text-sm text-rice-200/70 transition hover:text-rice-100"
                  >
                    返回
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
