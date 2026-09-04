import { useEffect } from "react";
import { motion } from "framer-motion";
import HistoricalScene from "../story/HistoricalScene";
import ChapterBackdrop from "../shared/ChapterBackdrop";
import ArtifactPresence from "../artifact/ArtifactPresence";
import { hezun } from "../../data/artifacts/hezun";
import { useGameStore } from "../../store/gameStore";

export default function ChapterTwo() {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const setStage = useGameStore((s) => s.setStage);

  useEffect(() => {
    markDiscovered("history");
  }, [markDiscovered]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <ChapterBackdrop motif="forge" />

      {/*
        讲述者继续在场：偏到右下、压得很暗，像"刚从范里出来还在炉边"的器物。
        放在正文之前渲染，正文自带 z-10 会盖在它上面。
      */}
      <ArtifactPresence
        artifact={hezun}
        opacity={0.16}
        className="-right-[18vw] bottom-[-12vh] h-[58vh] w-[58vh] sm:-right-[2vw]"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute left-[calc(1.5rem+var(--safe-left))] top-[calc(5rem+var(--safe-top))] z-10 sm:left-10 sm:top-24"
      >
        <p className="text-xs tracking-widest text-gilt-light/70">第二章</p>
        <h1 className="font-title text-2xl text-rice-100 sm:text-3xl">我为什么会被铸造</h1>
      </motion.div>

      <HistoricalScene onContinue={() => setStage("chapter3")} continueLabel="继续听我说 →" />

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setStage("chapter1")}
        className="fixed left-[calc(1.5rem+var(--safe-left))] top-[calc(1.5rem+var(--safe-top))] z-20 text-xs tracking-wide text-rice-100/60 sm:left-8 sm:top-8"
      >
        ← 上一章
      </motion.button>
    </div>
  );
}
