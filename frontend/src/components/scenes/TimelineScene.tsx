import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChapterBackdrop from "../shared/ChapterBackdrop";
import Timeline from "../story/Timeline";
import SpanBar from "../story/SpanBar";
import TraceGlyphs from "../story/TraceGlyphs";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";

/**
 * 「我的一生」时间线。
 *
 * 这里是整条主线的终点，所以底部只留「生成我的记忆卡」一个出口 ——
 * 原先那个"回到某一章"的按钮会把人往回推，反而让人不知道自己到没到头；
 * 想回头看的人有顶部导航条（认识我 / 探索历史）。
 *
 * 档案里写了 traceGlyphs 的文物（何尊）：出口按钮先走「金文描红」仪式，
 * 描完/跳过再开记忆卡（仿 MemoryCard needsPrompt 的前置弹层先例）。
 * 按钮文案不变——出口仍然只有一个，只是多一步仪式。
 */
export default function TimelineScene() {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const openMemoryCard = useGameStore((s) => s.openMemoryCard);
  const setTracedGlyphs = useGameStore((s) => s.setTracedGlyphs);
  const tracedGlyphs = useGameStore((s) => s.tracedGlyphs);
  const artifactId = useGameStore((s) => s.currentArtifactId);

  const [traceOpen, setTraceOpen] = useState(false);

  const artifact = getArtifact(artifactId);

  useEffect(() => {
    // 热点 id 因文物而异，所以按类型找，找不到就不标记
    const id = artifact.hotspots.find((h) => h.type === "timeline")?.id;
    if (id) markDiscovered(id);
  }, [markDiscovered, artifact]);

  const handleExit = () => {
    if (artifact.traceGlyphs && tracedGlyphs === null) {
      setTraceOpen(true);
    } else {
      openMemoryCard();
    }
  };

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
          <Timeline events={artifact.timeline} />
        </div>

        {artifact.span && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-8 w-full"
          >
            <SpanBar
              castYear={artifact.span.castYear}
              foundYear={artifact.span.foundYear}
              note={artifact.span.note}
            />
          </motion.div>
        )}

        {/* 出口在内容流内（SpanBar 之后）：天然远离右下悬浮钮、保持居中。
            之前钉在 flex 底部，要么与悬浮钮同带打架、要么 pr 让位挤偏（都踩过）。 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <button
            onClick={handleExit}
            className="rounded-full border border-gilt/40 bg-ink-900/40 px-6 py-3 text-sm tracking-wide text-gilt-light shadow-[0_0_30px_rgba(201,167,106,0.12)] backdrop-blur-sm transition hover:bg-gilt/10"
          >
            生成我的记忆卡 →
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {traceOpen && artifact.traceGlyphs && (
          <TraceGlyphs
            chars={artifact.traceGlyphs.chars}
            onComplete={(dataUrls) => {
              setTracedGlyphs(dataUrls);
              setTraceOpen(false);
              openMemoryCard();
            }}
            onSkip={() => {
              // 跳过 = 描过但全空：下次点出口不再弹（needsPrompt 同款三态语义）
              setTracedGlyphs(artifact.traceGlyphs!.chars.map(() => null));
              setTraceOpen(false);
              openMemoryCard();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
