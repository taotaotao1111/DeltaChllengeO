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

  // 根容器**不能有不透明背景色**。场景背景层（InkBackground / ChapterBackdrop）都是
  // `fixed inset-0 -z-10`，而这个 div 既不是 stacking context、又铺满全屏：按 CSS 绘制顺序，
  // 负 z-index 的后代会画在它的背景色**之下**，整层背景于是被吃掉——这正是"第二章之后
  // 只剩纯色加文字"的真正原因。底色交给 index.css 里的 body（#0a0a0c），视觉上无差别。
  return (
    <div className="relative h-dvh w-full font-sans">
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

      {/*
        开场那一屏不出现溯源入口：竖版海报底部已经排满了标题与小字，
        再叠一行链接会显得杂乱，也和「推门进去」这个唯一动作抢注意力。
        但它不能整个删掉——史料溯源是本作品的立身之本，进入展厅后仍需随时可查。
      */}
      {stage !== "museum" && (
        <Link
          to="/sources"
          className="fixed bottom-[calc(0.6rem+var(--safe-bottom))] left-1/2 z-30 -translate-x-1/2 text-[10px] tracking-wide text-rice-200/25 transition hover:text-rice-200/60"
        >
          数字资料来源
        </Link>
      )}
    </div>
  );
}
