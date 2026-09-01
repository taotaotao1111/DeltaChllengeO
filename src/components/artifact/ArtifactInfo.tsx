import { AnimatePresence, motion } from "framer-motion";
import type { Fact, Hotspot } from "../../types/artifact";

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
  return (
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
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:bottom-auto sm:right-8 sm:top-1/2 sm:w-[380px] sm:-translate-y-1/2"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="rounded-t-2xl border border-gilt/20 bg-ink-800/95 p-6 shadow-2xl backdrop-blur-md sm:rounded-2xl">
              <div className="mb-1 text-xs tracking-widest text-gilt-light/70">
                {hotspot.teaser}
              </div>
              <h3 className="font-title text-xl text-rice-100">{hotspot.title}</h3>
              <div className="ink-divider my-4" />
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

              <div className="mt-5 flex justify-end gap-3">
                {hotspot.type === "timeline" && onGoTimeline && (
                  <button
                    onClick={onGoTimeline}
                    className="rounded-full bg-gilt/20 px-4 py-2 text-xs text-gilt-light transition hover:bg-gilt/30"
                  >
                    查看完整时间轴 →
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full border border-rice-200/15 px-4 py-2 text-xs text-rice-200/70 transition hover:text-rice-100"
                >
                  收起
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
