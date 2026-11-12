import { motion } from "framer-motion";
import ObserveModule from "./modules/ObserveModule";
import QaModule from "./modules/QaModule";
import RevealModule from "./modules/RevealModule";
import InscriptionModule from "./modules/InscriptionModule";
import FlipCardModule from "./modules/FlipCardModule";
import ChapterLeadArt from "../shared/ChapterLeadArt";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { track } from "../../utils/tracking";
import { getAdjacentChapter, getChapterAct } from "../../utils/narrative";

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
  const chapterEntry = useGameStore((s) => s.chapterEntry);
  const setStage = useGameStore((s) => s.setStage);
  const setChapter = useGameStore((s) => s.setChapter);
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const completeStory = useGameStore((s) => s.completeStory);

  const artifact = getArtifact(artifactId);
  const chapter = artifact.chapters[chapterIndex];
  if (!chapter) return null;

  const previousIndex = getAdjacentChapter(artifact, chapterIndex, -1);
  const nextIndex = getAdjacentChapter(artifact, chapterIndex, 1);
  const act = getChapterAct(artifact, chapterIndex);
  const isOptional = artifact.narrative?.optionalChapterIds.includes(chapter.id);
  const optionalIndex = artifact.chapters.findIndex((c, i) =>
    i > chapterIndex && artifact.narrative?.optionalChapterIds.includes(c.id),
  );
  const offersDeepDive = chapter.module.kind === "reveal" && optionalIndex >= 0;

  const onBack = () => previousIndex === undefined ? setStage("gallery") : setChapter(previousIndex, isOptional ? "closing" : "start");
  // 每次 onNext = 当前章完成（倒退重看不触发——setChapter 的 chapter_view 才是 view 语义）。
  // 同时标记章节已读（chapter:<id> 约定，ChapterMenu 的目录用），幂等去重天然成立
  const onNext = () => {
    if (offersDeepDive) track("continue_mainline", { artifactId });
    track("chapter_complete", { artifactId: artifactId, chapterIndex });
    markDiscovered(`chapter:${chapter.id}`);
    if (nextIndex === undefined) completeStory();
    else setChapter(nextIndex);
  };
  const onDeepDive = () => {
    track("deep_dive_open", { artifactId, chapterId: artifact.chapters[optionalIndex].id });
    markDiscovered(`chapter:${chapter.id}`);
    track("chapter_complete", { artifactId, chapterIndex });
    setChapter(optionalIndex);
  };

  const module = chapter.module;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/*
        章节背景层由 Home 统一铺（放在 AnimatePresence 之外）：切章的 0.6s
        mode="wait" 空窗里背景若跟着章节卸载，整屏会闪一下黑。这里不再铺。
      */}

      {/*
        开场氛围画（档案写了 openingArt 的章）：只陪 lead-in 念白，
        自治时间轴淡入 → 沉暗 → 退场，不与模块交互打架（z-0、pointer-events-none）。
        key 含 chapterIndex：切章重挂载，时间轴重新播。
      */}
      {chapter.openingArt && (
        <ChapterLeadArt
          key={`lead-art-${chapter.id}`}
          src={chapter.openingArt.src}
          caption={chapter.openingArt.caption}
          peakOpacity={chapter.openingArt.peakOpacity}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute left-[calc(1.5rem+var(--safe-left))] top-[calc(5rem+var(--safe-top))] z-10 sm:left-10 sm:top-24"
      >
        <div className="flex items-baseline gap-3">
        <p className="shrink-0 text-xs tracking-widest text-gilt-light/70">
          {act ? `${act.label}${isOptional ? " · 自选深入" : ""}` : chapter.label}
        </p>
        <h1 className="font-title text-2xl text-rice-100 sm:text-3xl">{act ? isOptional ? "完整铭文" : act.title : chapter.title}</h1>
        </div>
        {act && <p className="mt-2 text-xs text-rice-200/60">{chapter.title}</p>}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onBack}
        className="fixed left-[calc(1.5rem+var(--safe-left))] top-[calc(1.5rem+var(--safe-top))] z-20 text-xs tracking-wide text-rice-100/60 sm:left-8 sm:top-8"
      >
        {previousIndex === undefined ? "← 回到展厅" : isOptional ? "← 回到发现" : "← 上一段"}
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
          onDeepDive={offersDeepDive ? onDeepDive : undefined}
          initialPhase={chapterEntry === "closing" ? "closing" : "lead-in"}
        />
      )}
      {module.kind === "inscription" && (
        <InscriptionModule artifact={artifact} data={module} onNext={onNext} />
      )}
      {module.kind === "flip" && <FlipCardModule artifact={artifact} data={module} onNext={onNext} />}
    </div>
  );
}
