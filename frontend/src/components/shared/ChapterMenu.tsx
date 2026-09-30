import { AnimatePresence, motion } from "framer-motion";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import BronzeWaterClock from "./BronzeWaterClock";

interface ChapterMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 章节目录浮层：「认识我」的展开态。
 *
 * 五章之后「读完只能回第一章」的导航模型跟不上了——这里给出全章直达：
 * 章号 + 标题 + 一句话钩子（档案的 hook 字段）+ 已读标记。
 * 已读判定走 discoveredDetails 的 `chapter:<id>` 约定（ChapterHost 的 onNext
 * 统一标记，换文物自动清空），配色语义沿用热点探索的反转：未读朱砂、已读暗金。
 */
export default function ChapterMenu({ open, onClose }: ChapterMenuProps) {
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const chapterIndex = useGameStore((s) => s.chapterIndex);
  const stage = useGameStore((s) => s.stage);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const setChapter = useGameStore((s) => s.setChapter);
  const setStage = useGameStore((s) => s.setStage);

  const artifact = getArtifact(artifactId);
  const chapters = artifact.chapters;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="chapter-menu-mask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink-900/60"
            onClick={onClose}
          />
          <motion.div
            key="chapter-menu"
            /* ⚠️ 居中只能用 motion 的 x，不能混 Tailwind 的 -translate-x-1/2——
               framer-motion 的内联 transform 会整段覆盖 class 里的 transform，
               混用会让水平居中失效（实测：浮层从中线向右溢出半个屏宽） */
            initial={{ opacity: 0, y: -10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -10, x: "-50%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-1/2 top-[calc(4.5rem+var(--safe-top))] z-50 w-[86vw] max-w-sm overflow-hidden rounded-2xl border border-gilt/25 bg-ink-800/95 shadow-2xl backdrop-blur-md"
          >
            <p className="flex items-center gap-3 border-b border-rice-100/8 px-5 py-3 text-[11px] tracking-widest text-gilt-light/60">
              {/* 铜漏（大号）：读过的章节都存进这里的水位里 */}
              <BronzeWaterClock
                total={chapters.length}
                read={chapters.filter((c) => discovered.includes(`chapter:${c.id}`)).length}
                size="menu"
              />
              <span>
                {artifact.name} · {chapters.length} 章
                {chapters.filter((c) => discovered.includes(`chapter:${c.id}`)).length >
                  0 && (
                  <span className="ml-1 text-gilt/60">
                    · 水位{" "}
                    {chapters.filter((c) => discovered.includes(`chapter:${c.id}`)).length}/
                    {chapters.length}
                  </span>
                )}
              </span>
            </p>
            <div className="max-h-[54vh] overflow-y-auto overscroll-contain py-1">
              {chapters.map((c, i) => {
                const isCurrent = stage === "chapter" && chapterIndex === i;
                const isRead = discovered.includes(`chapter:${c.id}`);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChapter(i);
                      setStage("chapter");
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                      isCurrent ? "bg-gilt/15" : "hover:bg-rice-100/5"
                    }`}
                  >
                    {/* 已读/未读标记：未读朱砂（还有没读的），已读暗金（看过的让位） */}
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isRead ? "bg-gilt/60" : "bg-cinnabar-light"
                      }`}
                    />
                    <span className="w-12 shrink-0 text-[10px] tracking-widest text-rice-200/40">
                      {c.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`font-title block truncate text-sm ${
                          isCurrent ? "text-gilt-light" : "text-rice-100/90"
                        }`}
                      >
                        {c.title}
                      </span>
                      {!isRead && c.hook && (
                        <span className="mt-0.5 block truncate text-[11px] leading-4 text-rice-200/35">
                          {c.hook}
                        </span>
                      )}
                    </span>
                    {isCurrent && (
                      <span className="shrink-0 text-[10px] tracking-widest text-gilt/70">
                        在读
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
