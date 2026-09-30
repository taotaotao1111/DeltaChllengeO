import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../shared/SpeechReveal";
import { track } from "../../utils/tracking";
import type { AppraiseData, AppraiseQuestion, AppraiseSpotRegion } from "../../types/artifact";

interface AppraiseGateProps {
  artifactId: string;
  data: AppraiseData;
  onDone: () => void;
}

type Phase = "opening" | "questions" | "seal";

/**
 * 章末「鉴宝」环节：用户换位成验看者，三道题掌一次眼。
 *
 * 视觉语言完全沿用 GuessChoice（w-72 等宽胶囊、金边、回应切换），
 * 差别只在「有对错」：答对回金色，答偏的选项转暗金（呼应第一章
 * 「已探索暗金」的色彩语义——错处已被走过，但仍值得看）。
 *
 * 收束：盖一方朱砂「验看无误」印（scale 落印 + 微旋转，印泥晕染），
 * 出档位称号与收束句，然后放行去时间线。
 *
 * 埋点：每题一条 appraise_answer（questionId + correct），
 * stats 端能反推哪一章的知识没传达到。
 */
export default function AppraiseGate({ artifactId, data, onDone }: AppraiseGateProps) {
  const [phase, setPhase] = useState<Phase>("opening");
  const [qIndex, setQIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  /** 找茬式：点击落点（相对图面 0-1），画指认标记用 */
  const [spotMark, setSpotMark] = useState<{ x: number; y: number } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const question: AppraiseQuestion | undefined = data.questions[qIndex];
  const picked = question?.options?.find((o) => o.id === pickedId) ?? null;
  const pickedSpot = question?.spot?.regions.find((r) => r.id === pickedId) ?? null;
  const isLastQ = qIndex >= data.questions.length - 1;

  const pick = (id: string) => {
    if (pickedId) return;
    const opt = question?.options?.find((o) => o.id === id);
    const correct = opt?.correct ?? false;
    if (correct) setCorrectCount((c) => c + 1);
    track("appraise_answer", { artifactId, questionId: question!.id, correct: correct ? 1 : 0 });
    setPickedId(id);
  };

  /** 找茬式点击：坐标换算成相对图面比例，命中区域即作答 */
  const pickSpot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pickedId || !question?.spot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    setSpotMark({ x: rx, y: ry });
    const hit = question.spot.regions.find(
      (r) =>
        rx >= r.rect.x && rx <= r.rect.x + r.rect.w && ry >= r.rect.y && ry <= r.rect.y + r.rect.h,
    );
    const region: AppraiseSpotRegion | undefined = hit;
    if (region) {
      const correct = region.correct ?? false;
      if (correct) setCorrectCount((c) => c + 1);
      track("appraise_answer", { artifactId, questionId: question.id, correct: correct ? 1 : 0 });
      setPickedId(region.id);
    }
    // 没命中任何区域：只画标记不作答（点空白处相当于「还没指到地方」）
  };

  const advance = () => {
    if (!isLastQ) {
      setQIndex((i) => i + 1);
      setPickedId(null);
      setSpotMark(null);
    } else {
      setPhase("seal");
    }
  };

  const rank = data.ranks.find((r) => correctCount >= r.minCorrect) ?? data.ranks[data.ranks.length - 1];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <AnimatePresence mode="wait">
        {phase === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="flex w-full flex-col items-center"
          >
            <SpeechReveal
              lines={data.openingLines}
              lineDelay={data.lineDelay}
              onComplete={() => setPhase("questions")}
              holdLast
              textClassName="font-title text-xl leading-relaxed text-rice-100 sm:text-2xl"
              reveal={
                <p className="text-xs tracking-widest text-gilt-light/60">
                  · 共三题，答偏了也有人陪你走完 ·
                </p>
              }
              className="max-w-md"
            />
          </motion.div>
        )}

        {phase === "questions" && question && (
          <motion.div
            key={`q-${qIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="flex w-full flex-col items-center"
          >
            <p className="mb-6 text-[11px] tracking-widest text-gilt-light/50">
              验看 · {qIndex + 1}/{data.questions.length}
            </p>

            {/* 找茬式：点图指认。命中区域即作答；点空白只画标记、可再点 */}
            {question.spot ? (
              !pickedId ? (
                <div className="flex w-full flex-col items-center">
                  <p className="mb-5 font-title text-lg leading-relaxed text-rice-100 sm:text-xl">
                    {question.question}
                  </p>
                  <div
                    onClick={pickSpot}
                    className="relative mx-auto aspect-[2/3] h-[44vh] max-h-[460px] cursor-crosshair overflow-hidden rounded-lg"
                    style={{
                      border: "1px solid rgba(201,167,106,0.4)",
                      boxShadow: "0 0 24px rgba(201,167,106,0.14), 0 14px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    <img
                      src={question.spot.imageSrc}
                      alt="验看器物"
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                    {spotMark && (
                      <span
                        className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gilt-light shadow-[0_0_12px_rgba(201,167,106,0.8)]"
                        style={{ left: `${spotMark.x * 100}%`, top: `${spotMark.y * 100}%` }}
                      />
                    )}
                  </div>
                  {question.spot.caption && (
                    <p className="mt-3 text-[10px] text-rice-200/30">{question.spot.caption}</p>
                  )}
                </div>
              ) : (
                <div className="flex w-full flex-col items-center">
                  <p className="mb-2 text-xs tracking-widest text-gilt-light/60">
                    你指了「{pickedSpot?.label}」{pickedSpot?.correct ? " · 答对了" : ""}
                  </p>
                  <div
                    className="relative mx-auto mb-6 aspect-[2/3] h-[30vh] max-h-[320px] overflow-hidden rounded-lg opacity-60"
                    style={{ border: "1px solid rgba(201,167,106,0.3)" }}
                  >
                    <img
                      src={question.spot.imageSrc}
                      alt="验看器物"
                      draggable={false}
                      className="h-full w-full select-none object-cover"
                    />
                    {spotMark && (
                      <span
                        className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gilt-light shadow-[0_0_12px_rgba(201,167,106,0.9)]"
                        style={{ left: `${spotMark.x * 100}%`, top: `${spotMark.y * 100}%` }}
                      />
                    )}
                  </div>
                  <p className="mb-7 max-w-md font-title text-lg leading-relaxed text-rice-100 sm:text-xl">
                    {pickedSpot?.response}
                  </p>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={advance}
                    className="rounded-full bg-gilt/20 px-6 py-2.5 text-sm tracking-wide text-gilt-light transition hover:bg-gilt/30"
                  >
                    {isLastQ ? "盖印 →" : "继续验看 →"}
                  </motion.button>
                </div>
              )
            ) : !picked ? (
              <>
                <p className="font-title mb-6 text-lg leading-relaxed text-rice-100 sm:text-xl">
                  {question.question}
                </p>
                <div className="mx-auto flex w-72 flex-col items-stretch gap-2.5">
                  {question.options?.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => pick(opt.id)}
                      className="rounded-full border border-gilt/30 bg-ink-800/40 px-5 py-2.5 text-sm text-rice-100/90 transition hover:border-gilt/50 hover:bg-gilt/10"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="mb-2 text-xs tracking-widest text-gilt-light/60">
                  你选了「{picked?.label}」{picked?.correct ? " · 答对了" : ""}
                </p>
                <p className="mb-7 max-w-md font-title text-lg leading-relaxed text-rice-100 sm:text-xl">
                  {picked?.response}
                </p>
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={advance}
                  className="rounded-full bg-gilt/20 px-6 py-2.5 text-sm tracking-wide text-gilt-light transition hover:bg-gilt/30"
                >
                  {isLastQ ? "盖印 →" : "继续验看 →"}
                </motion.button>
              </>
            )}
          </motion.div>
        )}

        {phase === "seal" && (
          <motion.div
            key="seal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex w-full flex-col items-center"
          >
            {/* 朱砂印（落印 spring + 微旋转，印泥底光晕）。
                做旧质感版（SVG filter / canvas 噪声）两轮实测在 img/异步渲染路径
                下噪声层丢失或不稳定，收益配不上复杂度——按用户决定回退简洁版。 */}
            <motion.div
              initial={{ scale: 1.7, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: -3.5 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 18 }}
              className="relative mb-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 0.45, scale: 1.14 }}
                transition={{ delay: 0.55, duration: 1.1, ease: "easeOut" }}
                className="absolute inset-0 rounded-[10%] blur-md"
                style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(156,59,46,0.5), transparent 70%)" }}
              />
              <div className="flex h-24 w-24 items-center justify-center rounded-sm border-2 border-[#8c3a2e] bg-[#a03c2d]/85 shadow-[0_6px_24px_rgba(156,59,46,0.35)]">
                <div className="grid grid-cols-2 gap-x-1 px-2 font-title text-lg leading-none text-[#f3e6d0]">
                  <span>验</span>
                  <span>看</span>
                  <span>无</span>
                  <span>误</span>
                </div>
              </div>
            </motion.div>

            <p className="mb-2 text-xs tracking-widest text-cinnabar/80">{rank.title}</p>
            <p className="mb-4 font-title text-base leading-relaxed text-rice-100/90">{rank.line}</p>
            <p className="mb-8 max-w-md font-title text-lg leading-relaxed text-rice-100 sm:text-xl">
              {data.sealLine}
            </p>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              onClick={onDone}
              className="rounded-full bg-gilt/20 px-6 py-2.5 text-sm tracking-wide text-gilt-light shadow-[0_0_24px_rgba(201,167,106,0.15)] transition hover:bg-gilt/35"
            >
              {data.nextLabel ?? "看看我经历了多久 →"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
