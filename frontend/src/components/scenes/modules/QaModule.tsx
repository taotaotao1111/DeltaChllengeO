import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { flushSync } from "react-dom";
import SpeechReveal from "../../shared/SpeechReveal";
import StoryVideoOverlay from "../../shared/StoryVideoOverlay";
import ArtifactPresence from "../../artifact/ArtifactPresence";
import { useGameStore } from "../../../store/gameStore";
import type { Artifact, ArtifactChapter, QaModuleData } from "../../../types/artifact";
import { useStoryMoment } from "../../../utils/useStoryMoment";
import { storyVideoCompletionKey } from "../../../utils/storyVideo";
import StoryQuestionBubble from "../../ai/StoryQuestionBubble";
import "./QaModule.css";

type QA = QaModuleData["items"][number];
const NUMERALS = ["壹", "贰", "叁", "肆"];
interface QaModuleProps { artifact: Artifact; data: QaModuleData; presence?: ArtifactChapter["presence"]; onNext: () => void }

/** 点问题展开讲述与原版封面视频入口；视频仅由用户主动点播。 */
export default function QaModule({ artifact, data, presence, onNext }: QaModuleProps) {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const persistCheckpoint = useGameStore((s) => s.persistCheckpoint);
  const videoCompletionKey = data.fullStoryVideo ? storyVideoCompletionKey(data.fullStoryVideo.src) : null;
  const videoWatched = useGameStore((s) => videoCompletionKey !== null && s.discoveredDetails.includes(videoCompletionKey));
  const [introDone, setIntroDone] = useState(false);
  const [activeQA, setActiveQA] = useState<QA | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [storyDone, setStoryDone] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.4;
  const followUp = activeQA?.followUp;
  const hasUnheardStories = data.items.some((item) => item.id !== activeQA?.id && !visited.includes(item.id));

  useStoryMoment({
    id: `${artifact.id}:qa:${activeQA?.id ?? "opening"}`,
    title: activeQA?.question ?? "铸造的故事",
    summary: activeQA?.answer ?? data.openingLines.join("\n"),
    factIds: [...new Set([...(activeQA?.factIds ?? []), ...(followUp?.factIds ?? [])])],
    questions: followUp?.questions ?? [],
    prompt: followUp?.prompt,
    blockedQuestions: data.items.map((item) => item.question),
    ready: introDone && !!activeQA && storyDone && !videoOpen,
  });

  useEffect(() => {
    if (activeQA && !videoOpen) headingRef.current?.focus({ preventScroll: true });
  }, [activeQA, videoOpen]);

  const selectStory = (qa: QA) => {
    markDiscovered("history");
    setStoryDone(false);
    setActiveQA(qa);
  };
  const finishStory = (qa: QA) => {
    setStoryDone(true);
    setVisited((current) => current.includes(qa.id) ? current : [...current, qa.id]);
  };
  const chooseAnother = () => {
    setStoryDone(false);
    setActiveQA(null);
  };

  return <>
    {presence && <ArtifactPresence artifact={artifact} opacity={presence.opacity} className={presence.className} />}
    <div className="qa-story-page">
      <div className="qa-story-frame">
        <div className="qa-story-content">
          {!introDone ? <SpeechReveal lines={data.openingLines} lineDelay={data.lineDelay} onComplete={() => setIntroDone(true)}
            textClassName="font-title text-xl leading-relaxed text-rice-100 sm:text-2xl" /> : <>
            <AnimatePresence initial={false} mode="wait">
              {!activeQA ? <motion.section key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration }}>
                <header className="qa-story-heading">
                  <h2>{data.prompt}</h2>
                  <p>轻触一段，听{artifact.name}慢慢说</p>
                </header>
                <div className="qa-story-signs" role="group" aria-label="选择预设故事">
                  {data.items.map((qa, index) => <motion.button type="button" key={qa.id}
                    whileTap={{ scale: reduceMotion ? 1 : 0.99 }} onClick={() => selectStory(qa)} className="qa-story-sign">
                    <span className="qa-story-sign__number" aria-hidden="true">{NUMERALS[index] ?? index + 1}</span>
                    <span className="qa-story-sign__copy">
                      <strong>{qa.question}</strong>
                      {qa.teaser && <small>{qa.teaser}</small>}
                    </span>
                    <span className="qa-story-sign__end">
                      {visited.includes(qa.id) && <small>已听</small>}
                      <span aria-hidden="true">↗</span>
                    </span>
                  </motion.button>)}
                </div>
              </motion.section> : <motion.article key={activeQA.id} className="qa-story-detail"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration }} onAnimationComplete={(definition) => {
                  if (typeof definition === "object" && !Array.isArray(definition) && definition.opacity === 1) {
                    finishStory(activeQA);
                    headingRef.current?.focus({ preventScroll: true });
                  }
                }}>
                <header className="qa-story-detail__heading">
                  <div className="qa-story-detail__meta">
                    <span>{String(data.items.indexOf(activeQA) + 1).padStart(2, "0")} / {String(data.items.length).padStart(2, "0")}</span>
                  </div>
                  <h2 ref={headingRef} tabIndex={-1}>{activeQA.question}</h2>
                </header>
                <div className="qa-story-answer">
                  <p className="qa-story-answer__speaker">{artifact.name} · 讲述</p>
                  <p className="qa-story-answer__text">{activeQA.answer}</p>
                </div>
                {data.fullStoryVideo && <button type="button" aria-label={`${videoWatched ? "已观看，再看一次" : "观看完整故事影像"}：${artifact.name}的自我介绍`}
                  onClick={() => {
                    markDiscovered("history");
                    // 同步挂载播放器，让带声 play() 留在这次点击手势内（尤其是 iOS）。
                    flushSync(() => setVideoOpen(true));
                  }} className={videoWatched ? "qa-story-video qa-story-video--watched" : "qa-story-video group flex w-full items-center gap-3 rounded-xl border border-gilt/20 bg-ink-800/60 py-2 pl-2 pr-4 backdrop-blur-sm transition hover:border-gilt/45 hover:bg-ink-800/90"}>
                  {videoWatched ? <>
                    <span aria-hidden="true">▷</span>
                    <span>已观看 · 再看一次</span>
                    <span className="ml-auto" aria-hidden="true">↗</span>
                  </> : <>
                  <span className="relative block h-[52px] w-[84px] shrink-0 overflow-hidden rounded-lg">
                    {data.fullStoryVideo.poster && <img src={data.fullStoryVideo.poster} alt={`${artifact.name}的自我介绍`}
                      className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100" />}
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-900/25">
                      <span className="animate-breathe ml-0.5 inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-gilt-light drop-shadow-[0_0_8px_rgba(201,167,106,0.5)]" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col items-start text-left">
                    <span className="font-title text-sm text-rice-100/90">观看完整故事影像</span>
                    <span className="mt-0.5 text-[10px] tracking-wide text-rice-200/40">
                      {data.fullStoryVideo.durationSec} 秒 · 看看三千岁的我怎么介绍自己
                    </span>
                  </span>
                  </>}
                </button>}
                {storyDone && <div className="mt-5"><StoryQuestionBubble compact variant="story" /></div>}
                {storyDone && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration }}>
                  <div className="qa-story-actions">
                    {hasUnheardStories && <button type="button" onClick={chooseAnother}>再听一个问题</button>}
                    <button type="button" onClick={onNext} className="qa-story-actions__continue">继续故事 <span aria-hidden="true">→</span></button>
                  </div>
                </motion.div>}
              </motion.article>}
            </AnimatePresence>
          </>}
        </div>
      </div>
    </div>
    {videoOpen && data.fullStoryVideo && <StoryVideoOverlay src={data.fullStoryVideo.src} poster={data.fullStoryVideo.poster}
      title={`${artifact.name}的完整故事`} onClose={() => setVideoOpen(false)} onComplete={() => {
        if (videoCompletionKey) {
          markDiscovered(videoCompletionKey);
          persistCheckpoint();
        }
      }} />}
  </>;
}
