import { useEffect } from "react";
import { motion } from "framer-motion";
import ChapterBackdrop from "../shared/ChapterBackdrop";
import Timeline from "../story/Timeline";
import SpanBar from "../story/SpanBar";
import { hezun } from "../../data/artifacts/hezun";
import { useGameStore } from "../../store/gameStore";

/**
 * 「我的一生」时间线。
 *
 * 这里是整条主线的终点，所以底部只留「生成我的记忆卡」一个出口 ——
 * 原先那个"回到某一章"的按钮会把人往回推，反而让人不知道自己到没到头；
 * 想回头看的人有顶部导航条（认识我 / 探索历史）。
 */
export default function TimelineScene() {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const openMemoryCard = useGameStore((s) => s.openMemoryCard);

  useEffect(() => {
    markDiscovered("hotspot-timeline");
  }, [markDiscovered]);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      <ChapterBackdrop motif="strata" />

      <div className="flex flex-1 flex-col items-center justify-center px-4 pt-[calc(4rem+var(--safe-top))]">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-1 text-xs tracking-widest text-gilt-light/60"
        >
          我的一生
        </motion.p>
        <div className="w-full max-w-3xl">
          <Timeline events={hezun.timeline} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-8 w-full"
        >
          <SpanBar />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap justify-center gap-3 pb-[calc(2.5rem+var(--safe-bottom))]"
      >
        <button
          onClick={() => openMemoryCard()}
          className="rounded-full border border-gilt/40 bg-ink-900/40 px-6 py-3 text-sm tracking-wide text-gilt-light shadow-[0_0_30px_rgba(201,167,106,0.12)] backdrop-blur-sm transition hover:bg-gilt/10"
        >
          生成我的记忆卡 →
        </button>
      </motion.div>
    </div>
  );
}
