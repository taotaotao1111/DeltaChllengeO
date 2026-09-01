import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import MuseumScene from "../components/museum/MuseumScene";
import GalleryScene from "../components/museum/GalleryScene";
import ChapterOne from "../components/scenes/ChapterOne";
import ChapterTwo from "../components/scenes/ChapterTwo";
import ChapterThree from "../components/scenes/ChapterThree";
import TimelineScene from "../components/scenes/TimelineScene";
import SectionNav from "../components/shared/SectionNav";
import ArtifactChat from "../components/ai/ArtifactChat";
import MemoryCard from "../components/memory/MemoryCard";

/**
 * 记忆卡不再做常驻悬浮入口 —— 它是"看完之后带走一点东西"的收尾动作，
 * 全程挂在左下角既碍事，也让人以为随时该点。现在只从时间线（我的一生）
 * 和 AI 对话里进入。
 */
export default function Home() {
  const stage = useGameStore((s) => s.stage);

  return (
    <div className="relative h-dvh w-full bg-ink-900 font-sans">
      <SectionNav />

      <AnimatePresence mode="wait">
        {stage === "museum" && (
          <motion.div key="museum" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <MuseumScene />
          </motion.div>
        )}
        {stage === "gallery" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GalleryScene />
          </motion.div>
        )}
        {stage === "chapter1" && (
          <motion.div
            key="chapter1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ChapterOne />
          </motion.div>
        )}
        {stage === "chapter2" && (
          <motion.div
            key="chapter2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ChapterTwo />
          </motion.div>
        )}
        {stage === "chapter3" && (
          <motion.div
            key="chapter3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ChapterThree />
          </motion.div>
        )}
        {stage === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <TimelineScene />
          </motion.div>
        )}
      </AnimatePresence>

      <ArtifactChat />
      <MemoryCard />

      <Link
        to="/sources"
        className="fixed bottom-[calc(0.6rem+var(--safe-bottom))] left-1/2 z-30 -translate-x-1/2 text-[10px] tracking-wide text-rice-200/25 transition hover:text-rice-200/60"
      >
        数字资料来源
      </Link>
    </div>
  );
}
