import { AnimatePresence, motion } from "framer-motion";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { getStoryActs } from "../../utils/narrative";

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
    setChapter(index);
    setStage("chapter");
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
          transition={{ duration: 0.3, ease: "easeOut" }} className="overflow-hidden rounded-2xl border border-gilt/25 bg-ink-800/95 shadow-2xl backdrop-blur-md">
          <p className="border-b border-rice-100/10 px-5 py-3 text-[11px] tracking-widest text-gilt-light/60">
            {artifact.name} · {artifact.narrative ? `三幕故事 · ${artifact.narrative.durationLabel}` : "故事目录"}
          </p>
          <div className="max-h-[54vh] overflow-y-auto overscroll-contain py-2">
            {acts.map((act) => {
              const isCurrent = stage === "chapter" && act.chapterIndices.includes(chapterIndex);
              const isRead = act.mainIndices.length > 0 && act.mainIndices.every((i) => discovered.includes(`chapter:${artifact.chapters[i].id}`));
              const target = act.mainIndices[0] ?? act.chapterIndices[0];
              if (target === undefined) return null;
              return (
                <div key={act.id} className={isCurrent ? "bg-gilt/10" : ""}>
                  <button onClick={() => enter(target)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-rice-100/5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isRead ? "bg-gilt/60" : "bg-cinnabar-light"}`} />
                    <span className="w-12 shrink-0 text-[11px] tracking-widest text-rice-200/60">{act.label}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`font-title block text-base ${isCurrent ? "text-gilt-light" : "text-rice-100/90"}`}>{act.title}</span>
                      <span className="mt-1 block text-[11px] leading-5 text-rice-200/50">{act.mainIndices.map((i) => artifact.chapters[i].title).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-gilt-light/70">{isCurrent ? "在读" : isRead ? "已读" : ""}</span>
                  </button>
                  {act.optionalIndices.map((index) => {
                    const chapter = artifact.chapters[index];
                    return <button key={chapter.id} onClick={() => enter(index)} className="mb-3 ml-12 block min-h-10 rounded-full border border-gilt/20 px-4 py-2 text-left text-xs text-gilt-light/80 transition hover:bg-gilt/10">
                      自选深入 · {chapter.module.kind === "inscription" ? "完整铭文" : chapter.title}
                      {discovered.includes(`chapter:${chapter.id}`) ? " · 已读" : " →"}
                    </button>;
                  })}
                </div>
              );
            })}
          </div>
        </motion.div>
        </div>
      </>}
    </AnimatePresence>
  );
}
