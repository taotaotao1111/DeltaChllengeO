import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { Fact, Hotspot } from "../../types/artifact";
import StoryQuestionBubble from "../ai/StoryQuestionBubble";

interface ArtifactInfoProps {
  hotspot: Hotspot | null;
  facts: Fact[];
  onClose: () => void;
  onGoTimeline?: () => void;
}

/**
 * 探索详情面板（用于 纹饰 / 器型 / 时间轴入口 三类热点）。
 * 铭文热点使用独立的全屏聚焦组件 InscriptionFocus，视觉规格不同，此处不处理。
 */
export default function ArtifactInfo({ hotspot, facts, onClose, onGoTimeline }: ArtifactInfoProps) {
  return createPortal(
    <AnimatePresence>
      {hotspot && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* 定位容器不参与动画，避免 motion 的 y 覆盖桌面居中的 CSS transform。
              挂到 body，避免章节淡入产生的层叠上下文让 AI 悬浮入口盖住面板。 */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end sm:px-8 sm:py-6">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={hotspot.title}
            className="pointer-events-auto flex max-h-[85dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-2xl border border-gilt/20 bg-ink-800/95 shadow-2xl backdrop-blur-md sm:max-h-full sm:w-[380px] sm:rounded-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <header className="shrink-0 px-6 pt-6">
              <div className="mb-1 text-xs tracking-widest text-gilt-light/70">
                {hotspot.teaser}
              </div>
              <h3 className="font-title text-xl text-rice-100">{hotspot.title}</h3>
              <div className="ink-divider my-4" />
            </header>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-1">
              <p className="whitespace-pre-line text-sm leading-7 text-rice-200/85">
                {hotspot.story}
              </p>

              {facts.length > 0 && (
                <div className="mt-4 space-y-2 border-l border-gilt/20 pl-3">
                  {facts.map((f) => (
                    <p key={f.id} className="text-xs leading-6 text-rice-200/50">
                      <span className="mr-1 rounded bg-gilt/10 px-1.5 py-0.5 text-[10px] text-gilt-light/80">
                        {f.confidence === "verified" ? "已核实" : "推测"}
                      </span>
                      {f.content}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-4"><StoryQuestionBubble compact /></div>
            </div>
              <footer className="flex shrink-0 justify-end gap-3 px-6 pb-[calc(1rem+var(--safe-bottom))] pt-4 sm:pb-6">
                {hotspot.type === "timeline" && onGoTimeline && (
                  <button
                    onClick={onGoTimeline}
                    className="min-h-11 rounded-full bg-gilt/20 px-4 py-2 text-xs text-gilt-light transition hover:bg-gilt/30"
                  >
                    查看完整时间轴 →
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="min-h-11 rounded-full border border-rice-200/15 px-4 py-2 text-xs text-rice-200/70 transition hover:text-rice-100"
                >
                  收起
                </button>
              </footer>
          </motion.section>
          </div>
        </>
      )}
    </AnimatePresence>, document.body,
  );
}
