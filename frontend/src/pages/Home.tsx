import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import MuseumScene from "../components/museum/MuseumScene";
import GalleryScene from "../components/museum/GalleryScene";
import ChapterHost from "../components/scenes/ChapterHost";
import TimelineScene from "../components/scenes/TimelineScene";
import SectionNav from "../components/shared/SectionNav";
import ArtifactChat from "../components/ai/ArtifactChat";
import MemoryCard from "../components/memory/MemoryCard";
import InkBackground from "../components/shared/InkBackground";
import ChapterBackdrop from "../components/shared/ChapterBackdrop";
import { getArtifact } from "../data/artifacts";

/**
 * 记忆卡不再做常驻悬浮入口 —— 它是"看完之后带走一点东西"的收尾动作，
 * 全程挂在左下角既碍事，也让人以为随时该点。现在只从时间线（我的一生）
 * 和 AI 对话里进入。
 */
export default function Home() {
  const stage = useGameStore((s) => s.stage);
  const currentArtifactId = useGameStore((s) => s.currentArtifactId);
  const chapterIndex = useGameStore((s) => s.chapterIndex);

  /*
   * 章节背景放在 AnimatePresence 之外、由 store 状态直接驱动：
   * 切章时章节内容退场/进场有 0.6s 的 mode="wait" 空窗，背景若跟着章节走，
   * 这 0.6s 里 `-z-10` 的背景层跟着卸载、整屏只剩 body 底色——这就是
   * 「每章进去都闪一下黑」的来源。背景先铺好，内容再淡入，视觉上是无缝的。
   */
  const chapterArtifact = getArtifact(currentArtifactId);
  const activeChapter =
    stage === "chapter" ? chapterArtifact.chapters[chapterIndex] : null;

  // 根容器**不能有不透明背景色**。场景背景层（InkBackground / ChapterBackdrop）都是
  // `fixed inset-0 -z-10`，而这个 div 既不是 stacking context、又铺满全屏：按 CSS 绘制顺序，
  // 负 z-index 的后代会画在它的背景色**之下**，整层背景于是被吃掉——这正是"第二章之后
  // 只剩纯色加文字"的真正原因。底色交给 index.css 里的 body（#0a0a0c），视觉上无差别。
  return (
    <div className="relative h-dvh w-full font-sans">
      {activeChapter ? (
        <ChapterBackdrop
          key={`backdrop-${currentArtifactId}-${chapterIndex}`}
          motif={activeChapter.backdrop ?? "patina"}
          glyphs={activeChapter.backdropGlyphs}
        />
      ) : stage === "timeline" ? (
        <ChapterBackdrop motif="strata" />
      ) : (
        <InkBackground glow={1} />
      )}

      <SectionNav />

      {/*
        场景/章节切换不用 AnimatePresence 退场动画（历史上 wait 模式下新章子树
        会被 framer「预挂载再卸载」一次，SpeechReveal 第一句播两遍——用户看到的
        「切章闪一下重新开始」；背景层已提到本层常驻，切换无黑屏）。普通条件
        渲染 + 单层淡入即可：key 变化 = 卸载重挂，模块 phase 自然重置。
      */}
      {stage === "museum" && <MuseumScene />}
      {stage === "gallery" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <GalleryScene />
        </motion.div>
      )}
      {stage === "chapter" && (
        /*
          key 必须同时含文物 id 与章序号：换章时要整体卸载重挂载（原来三个 stage
          天然如此），否则 React 会复用同一个实例、模块内部的 phase 不重置，
          表现为切章后念白不从头播——TS 完全看不出来。
        */
        <motion.div
          key={`chapter-${currentArtifactId}-${chapterIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ChapterHost />
        </motion.div>
      )}
      {stage === "timeline" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <TimelineScene />
        </motion.div>
      )}

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
