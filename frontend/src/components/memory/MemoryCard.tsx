import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { getArtifact } from "../../data/artifacts";
import { renderCard } from "./cardCanvas";
import { useScrollLock } from "../../utils/useScrollLock";
import { buildExplorationMemory } from "../../utils/explorationMemory";
import TraceGlyphs from "../story/TraceGlyphs";
import ExtraDialog from "../shared/ExtraDialog";

const LEGACY_PROMPT = "如果三千年后，有人看到今天的你，你想留下什么？";

function formatToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function MemoryCard() {
  const open = useGameStore((s) => s.memoryCardOpen);
  const closeCard = useGameStore((s) => s.closeMemoryCard);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const selectedLine = useGameStore((s) => s.selectedMemoryLine);
  const messages = useGameStore((s) => s.chatMessages);
  const userLegacyLine = useGameStore((s) => s.userLegacyLine);
  const setUserLegacyLine = useGameStore((s) => s.setUserLegacyLine);
  const snapshot = useGameStore((s) => s.artifactSnapshot);
  const tracedGlyphs = useGameStore((s) => s.tracedGlyphs);
  const setTracedGlyphs = useGameStore((s) => s.setTracedGlyphs);
  const artifactId = useGameStore((s) => s.currentArtifactId);

  const artifact = getArtifact(artifactId);

  const [draft, setDraft] = useState("");
  const [editingLegacy, setEditingLegacy] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  /** 导出好的图片（dataURL）。非空时展示导出浮层，让用户长按保存或分享 */
  const [exported, setExported] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const close = () => {
    setExported(null);
    setEditingLegacy(false);
    setTraceOpen(false);
    closeCard();
  };

  const memoryLine = useMemo(
    () => selectedLine ?? artifact.memoryLines[0],
    [selectedLine, artifact],
  );
  const memory = useMemo(() => buildExplorationMemory(artifact, discovered, messages), [artifact, discovered, messages]);
  const insight = memory.insight;
  const questionLabel = "你问过的问题";
  const myQuestion = memory.questions.slice(-3).join("\n");
  const hasLegacy = !!userLegacyLine;
  const needsPrompt = editingLegacy;

  /**
   * 弹层打开期间锁住页面滚动。
   * 不锁的话在 iOS 上手指按住卡片拖动会穿透到 document，整页上下左右乱滑。
   */
  useScrollLock(open);

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
    setExportError("");
    try {
      const canvas = await renderCard({
        kicker: `${artifact.name} · ${artifact.shortPeriod}`,
        sealChars: artifact.sealChars,
        memoryLine,
        insight,
        insightLabel: memory.insightLabel,
        questionLabel,
        myQuestion,
        legacyLine: userLegacyLine || null,
        snapshot,
        tracedGlyphs,
        discoveredCount: memory.details.length,
        exploredTitles: memory.details,
        completedTitles: memory.completed,
        storyUnit: memory.storyUnit,
      });
      setExported(canvas.toDataURL("image/png"));
    } catch (err) {
      console.warn("[MemoryCard] 生成卡片失败", err);
      setExportError("卡片暂时没有保存成功，可以再试一次。");
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
            /* touch-none：遮罩上的拖动不产生任何滚动手势，避免带着整页跑 */
            className="fixed inset-0 z-[70] touch-none bg-ink-900/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={needsPrompt ? undefined : close}
          />
          <motion.div
            /*
              ⚠️ 这一层不能加 touch-none：touch-action 会和祖先取交集，
              父层写 none 会把里面卡片的纵向滚动一起禁掉。拦穿透靠 useScrollLock。
            */
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
                    onClick={() => { setUserLegacyLine(draft.trim()); setEditingLegacy(false); }}
                    disabled={!draft.trim()}
                    className="flex-1 rounded-full bg-gilt/25 py-2.5 text-sm text-gilt-light transition hover:bg-gilt/35 disabled:opacity-30"
                  >
                    写进记忆卡 →
                  </button>
                  <button
                    onClick={() => setEditingLegacy(false)}
                    className="rounded-full border border-rice-100/15 px-4 py-2.5 text-sm text-rice-200/60 transition hover:text-rice-100"
                  >
                    返回卡片
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gilt/25 bg-ink-800/95 shadow-2xl">
                {/* touch-pan-y + overscroll-contain：只允许纵向滚，且滚到头不把手势交给外层 */}
                <div className="scrollbar-none touch-pan-y overflow-y-auto overscroll-contain px-6 py-7 sm:px-7">
                  {/* 抬头：文物身份，小而轻 */}
                  <p className="text-[11px] tracking-widest text-rice-200/40">
                    {artifact.name} · {artifact.dynasty}
                  </p>
                  <p className="font-title mt-2 text-base text-rice-100/85">我的千年相遇</p>
                  <p className="mt-2 text-xs leading-6 text-rice-200/55">根据你这次的探索留下，随时可以添加自己的笔迹和留言。</p>

                  {/* 用户转到的那个角度——每张卡都不一样 */}
                  {snapshot && (
                    <div className="relative mt-5 flex justify-center">
                      <div className="pointer-events-none absolute inset-x-6 bottom-2 h-16 rounded-full bg-gilt/10 blur-2xl" />
                      <img
                        src={snapshot}
                        alt={`你看到的${artifact.name}`}
                        className="relative h-40 w-40 object-contain"
                      />
                    </div>
                  )}

                  {/* 主角：何尊留下的那句话。整张卡只放大这一处 */}
                  <p className="font-title mt-6 whitespace-pre-line text-[22px] leading-[1.75] text-rice-100">
                    {memoryLine}
                  </p>

                  <div className="ink-divider my-6" />

                  <p className="text-[11px] tracking-widest text-gilt/60">{memory.insightLabel}</p>
                  <p className="mt-2 text-[13px] leading-7 text-gilt-light/90">{insight}</p>

                  {memory.details.length > 0 && <><p className="mt-6 text-[11px] tracking-widest text-gilt/60">我看过的细节 · {memory.details.length} 处</p><p className="mt-2 text-[13px] leading-7 text-rice-100/75">{memory.details.join(" · ")}</p></>}
                  {memory.completed.length > 0 && <><p className="mt-6 text-[11px] tracking-widest text-gilt/60">我读完的故事 · {memory.completed.length} {memory.storyUnit}</p><p className="mt-2 text-[13px] leading-7 text-rice-100/75">{memory.completed.join(" / ")}</p></>}
                  {myQuestion && <><p className="mt-6 text-[11px] tracking-widest text-gilt/60">{questionLabel}</p><p className="mt-2 whitespace-pre-line text-[13px] leading-7 text-rice-100/70">{myQuestion}</p></>}

                  {hasLegacy && (
                    <>
                      <p className="mt-6 text-[11px] tracking-widest text-gilt/60">
                        你留给三千年后的话
                      </p>
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-7 text-rice-100/85">
                        「{userLegacyLine}」
                      </p>
                      <p className="mt-2 text-[11px] italic text-gilt-light/50">
                        这句话，也留在这张卡里。
                      </p>
                    </>
                  )}

                  {/* 描红笔迹：有笔迹的字才展示（全跳过就不占位） */}
                  {tracedGlyphs?.some((t) => !!t) && (
                    <>
                      <p className="mt-6 text-[11px] tracking-widest text-gilt/60">
                        你亲手描下的字
                      </p>
                      <div className="mt-3 flex justify-center gap-3">
                        {tracedGlyphs.map((t, i) =>
                          t ? (
                            <img key={i} src={t} alt={`描红的第${i + 1}个字`} className="h-16 w-16 object-contain" />
                          ) : (
                            <span
                              key={i}
                              className="h-16 w-16 rounded-sm border border-dashed border-rice-200/20"
                            />
                          ),
                        )}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-rice-200/35">
                        三千年前的笔画，你补了一笔。
                      </p>
                    </>
                  )}

                  {/* 落款：日期 + 痕迹 + 方印 */}
                  <div className="ink-divider my-6" />
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] text-rice-200/40">
                        {formatToday()} · {memory.details.length} 处细节 · {memory.completed.length} {memory.storyUnit}故事
                      </p>
                      <p className="font-title mt-2 text-[13px] text-rice-100/60">《物语千年》</p>
                      <p className="mt-1 text-[10px] tracking-wide text-rice-200/35">
                        闭馆以后，文物终于可以说话了。
                      </p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[3px] border border-gilt/45 text-[11px] leading-tight text-gilt/75">
                      <span>{artifact.sealChars[0]}</span>
                      <span>{artifact.sealChars[1]}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-t border-rice-100/10 p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button onClick={() => { setDraft(userLegacyLine ?? ""); setEditingLegacy(true); }} className="min-h-10 rounded-full border border-gilt/25 px-3 text-xs text-gilt-light">{hasLegacy ? "编辑我的留言" : "＋ 留一句话"}</button>
                    {artifact.traceGlyphs && <button onClick={() => setTraceOpen(true)} className="min-h-10 rounded-full border border-gilt/25 px-3 text-xs text-gilt-light">{tracedGlyphs?.some(Boolean) ? "重新描红" : "＋ 亲手描红"}</button>}
                    {tracedGlyphs?.some(Boolean) && <button onClick={() => setTracedGlyphs(null)} className="min-h-10 px-2 text-xs text-rice-200/60">移除笔迹</button>}
                    {hasLegacy && <button onClick={() => setUserLegacyLine("")} className="min-h-10 px-2 text-xs text-rice-200/60">移除留言</button>}
                  </div>
                  {exportError && <p role="alert" className="mb-3 text-xs text-cinnabar-light">{exportError}</p>}
                  <div className="flex gap-3">
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
              </div>
            )}
          </motion.div>

          {traceOpen && artifact.traceGlyphs && <ExtraDialog title="记忆卡编辑 · 亲手描红" onClose={() => setTraceOpen(false)}><TraceGlyphs embedded chars={artifact.traceGlyphs.chars} onComplete={(images) => { setTracedGlyphs(images); setTraceOpen(false); }} onSkip={() => setTraceOpen(false)} /></ExtraDialog>}

          {/* 导出浮层：iOS 不支持 a.download，只能让用户长按图片存相册 */}
          <AnimatePresence>
            {exported && (
              <motion.div
                className="fixed inset-0 z-[80] flex touch-none flex-col items-center justify-center gap-4 bg-ink-900/95 p-5 pt-[calc(1.25rem+var(--safe-top))] pb-[calc(1.25rem+var(--safe-bottom))]"
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
