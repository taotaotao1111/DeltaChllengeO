import { motion } from "framer-motion";
import ObserveModule from "./modules/ObserveModule";
import QaModule from "./modules/QaModule";
import RevealModule from "./modules/RevealModule";
import InscriptionModule from "./modules/InscriptionModule";
import FlipCardModule from "./modules/FlipCardModule";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { track } from "../../utils/tracking";

/**
 * 章节外壳：把「第几章」这件事收拢到一处。
 *
 * 它只做三件事——铺背景、显示章名与返回入口、按 module.kind 把正文分发给对应模块。
 * **不持有任何模块内部的 phase 状态**（念白进度、除锈进度都归模块自己），
 * 也是唯一计算「上一章 / 下一章去哪里」的地方：模块只拿到 onNext / onBack 回调，
 * 不知道自己是第几章，所以一件只有一章的文物同样成立。
 */
export default function ChapterHost() {
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const chapterIndex = useGameStore((s) => s.chapterIndex);
  const setStage = useGameStore((s) => s.setStage);
  const setChapter = useGameStore((s) => s.setChapter);
  const markDiscovered = useGameStore((s) => s.markDiscovered);

  const artifact = getArtifact(artifactId);
  const chapter = artifact.chapters[chapterIndex];
  if (!chapter) return null;

  const isFirst = chapterIndex === 0;
  const isLast = chapterIndex >= artifact.chapters.length - 1;

  const onBack = () => (isFirst ? setStage("gallery") : setChapter(chapterIndex - 1));
  // 每次 onNext = 当前章完成（倒退重看不触发——setChapter 的 chapter_view 才是 view 语义）。
  // 同时标记章节已读（chapter:<id> 约定，ChapterMenu 的目录用），幂等去重天然成立
  const onNext = () => {
    track("chapter_complete", { artifactId: artifactId, chapterIndex });
    markDiscovered(`chapter:${chapter.id}`);
    if (isLast) setStage("timeline");
    else setChapter(chapterIndex + 1);
  };

  const module = chapter.module;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/*
        章节背景层由 Home 统一铺（放在 AnimatePresence 之外）：切章的 0.6s
        mode="wait" 空窗里背景若跟着章节卸载，整屏会闪一下黑。这里不再铺。
      */}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute left-[calc(1.5rem+var(--safe-left))] top-[calc(5rem+var(--safe-top))] z-10 sm:left-10 sm:top-24"
      >
        <p className="text-xs tracking-widest text-gilt-light/70">{chapter.label}</p>
        <h1 className="font-title text-2xl text-rice-100 sm:text-3xl">{chapter.title}</h1>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onBack}
        className="fixed left-[calc(1.5rem+var(--safe-left))] top-[calc(1.5rem+var(--safe-top))] z-20 text-xs tracking-wide text-rice-100/60 sm:left-8 sm:top-8"
      >
        {isFirst ? "← 回到展厅" : "← 上一章"}
      </motion.button>

      {module.kind === "observe" && (
        <ObserveModule artifact={artifact} data={module} onNext={onNext} />
      )}
      {module.kind === "qa" && (
        <QaModule
          artifact={artifact}
          data={module}
          presence={chapter.presence}
          onNext={onNext}
        />
      )}
      {module.kind === "reveal" && (
        <RevealModule
          artifact={artifact}
          data={module}
          presence={chapter.presence}
          onNext={onNext}
        />
      )}
      {module.kind === "inscription" && (
        <InscriptionModule artifact={artifact} data={module} onNext={onNext} />
      )}
      {module.kind === "flip" && <FlipCardModule artifact={artifact} data={module} onNext={onNext} />}
    </div>
  );
}
