import { AnimatePresence, motion } from "framer-motion";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { getStoryActs } from "../../utils/narrative";
import { track } from "../../utils/tracking";

interface ChapterMenuProps {
  open: boolean;
  onClose: () => void;
}

/** 面向用户的目录以幕组织；幕内内容节点继续使用原 ID 记录进度。 */
export default function ChapterMenu({ open, onClose }: ChapterMenuProps) {
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const chapterIndex = useGameStore((s) => s.chapterIndex);
  const stage = useGameStore((s) => s.stage);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const setChapter = useGameStore((s) => s.setChapter);
  const setStage = useGameStore((s) => s.setStage);
  const artifact = getArtifact(artifactId);
  const acts = getStoryActs(artifact);
  const enter = (index: number) => {
    // 当前段只收起目录，继续原位阅读，不重置段内交互。
    if (stage !== "chapter" || index !== chapterIndex) {
      setChapter(index);
      setStage("chapter");
      track("menu_navigation", { artifactId });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && <>
        <motion.div key="story-menu-mask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-ink-900/60" onClick={onClose} />
        {/* 桌面跟随导航右对齐；窄屏贴近控件组右侧，避免宽目录越出左边缘。 */}
        <div key="story-menu" className="fixed right-[calc(0.75rem+var(--safe-right))] top-[calc(4.5rem+var(--safe-top))] z-50 w-[86vw] max-w-sm sm:right-[calc(6rem+var(--safe-right))]">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }} className="flex max-h-[calc(100svh-5.5rem-var(--safe-top)-var(--safe-bottom))] flex-col overflow-hidden rounded-3xl border border-gilt/30 bg-[#100e0c]/95 shadow-2xl backdrop-blur-md">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-xs tracking-wide text-gilt-light/90">{artifact.name} · 故事目录</p>
            {artifact.narrative && <span className="shrink-0 text-[11px] text-rice-200/50">{artifact.narrative.durationLabel}</span>}
          </div>
          <nav aria-label={`${artifact.name}故事目录`} className="min-h-0 space-y-1.5 overflow-y-auto overscroll-contain px-3 pb-1 sm:px-4">
            {acts.map((act, actIndex) => {
              const isCurrent = stage === "chapter" && act.chapterIndices.includes(chapterIndex);
              const isCurrentMain = isCurrent && act.mainIndices.includes(chapterIndex);
              const isRead = act.mainIndices.length > 0 && act.mainIndices.every((i) => discovered.includes(`chapter:${artifact.chapters[i].id}`));
              const target = act.mainIndices[0] ?? act.chapterIndices[0];
              if (target === undefined) return null;
              return (
                <div key={act.id} className={`overflow-hidden rounded-xl border transition-colors ${isCurrent ? "border-gilt/65 bg-[#302515]/90" : "border-gilt/25 bg-[#1a1712]/85"}`}>
                  <button type="button" onClick={() => enter(isCurrentMain ? chapterIndex : target)} aria-current={isCurrentMain ? "step" : undefined}
                    className="block w-full px-3.5 py-3 text-left transition hover:bg-gilt/5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gilt-light sm:px-4">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span title={isRead ? "主线已读" : "主线未读完"} className={`h-1.5 w-1.5 shrink-0 rounded-full ${isRead ? "bg-gilt/60" : "bg-cinnabar-light"}`} />
                        <span className={`text-[11px] ${isCurrent ? "text-gilt-light" : "text-rice-200/60"}`}>{String(actIndex + 1).padStart(2, "0")} / {act.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-gilt-light/85">
                        {isCurrent && <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5"><path d="M10 5C7.5 3.5 4.8 3.5 2 4.5v11c2.8-1 5.5-1 8 .5m0-11c2.5-1.5 5.2-1.5 8-.5v11c-2.8-1-5.5-1-8 .5V5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>}
                        {isCurrent ? "正在阅读" : isRead ? "已读" : ""}
                      </span>
                    </span>
                    <span className="mt-2 block font-title text-xl leading-7 text-rice-100">{act.title}</span>
                    <span className="mt-1 flex items-center justify-between gap-3">
                      <span className="min-w-0 text-xs leading-5 text-rice-200/65">{act.mainIndices.map((i) => artifact.chapters[i].title).join(" · ")}</span>
                      {isCurrent && <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-gilt-light">{isCurrentMain ? "继续故事" : "返回主线"}<span aria-hidden="true">→</span></span>}
                    </span>
                  </button>
                  {act.optionalIndices.map((index) => {
                    const chapter = artifact.chapters[index];
                    const isOptionalCurrent = stage === "chapter" && chapterIndex === index;
                    return <button type="button" key={chapter.id} onClick={() => enter(index)} aria-current={isOptionalCurrent ? "step" : undefined}
                      className={`mx-3.5 mb-1 flex min-h-11 w-[calc(100%-1.75rem)] items-center justify-between gap-2 border-t border-gilt/25 py-2 text-left text-xs transition hover:text-gilt-light ${isOptionalCurrent ? "text-gilt-light" : "text-gilt-light/80"} sm:mx-4 sm:w-[calc(100%-2rem)]`}>
                      <span className="flex min-w-0 items-center gap-2">
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0"><path d="M5 3H3a1.5 1.5 0 1 0 1.5 1.5V15a2 2 0 0 0 2 2H16a1.5 1.5 0 0 0 0-3h-1V3H5Zm0 0v1.5M8 6h4M8 9h4M8 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span>{chapter.module.kind === "inscription" ? "完整铭文" : chapter.title} · 深入探索</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[10px]">
                        {isOptionalCurrent ? "在读" : discovered.includes(`chapter:${chapter.id}`) ? "已读" : ""}<span aria-hidden="true" className="text-sm">↗</span>
                      </span>
                    </button>;
                  })}
                </div>
              );
            })}
          </nav>
          <p className="shrink-0 px-4 py-2.5 text-center text-[11px] text-rice-200/45">每一段相遇，都可以重新开始</p>
        </motion.div>
        </div>
      </>}
    </AnimatePresence>
  );
}
