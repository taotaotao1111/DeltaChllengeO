import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../shared/SpeechReveal";
import AppraiseQuestionPanel from "./AppraiseQuestionPanel";
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
 * 金框内依次验形、辨量、断代；第一题点图，后两题保留器身缩略图。
 * 作答前的等宽选项统一使用中性色，避免切题后误显答案。
 * 作答后再切换到回应，展示是否答对与对应解释。
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
  const referenceImage = data.questions.find((q) => q.spot)?.spot?.imageSrc;

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
    if (hit) pickRegion(hit, { x: rx, y: ry });
    // 点空白只留下标记，不提交答案。
  };

  const pickRegion = (region: AppraiseSpotRegion, mark?: { x: number; y: number }) => {
    if (pickedId || !question?.spot) return;
    setSpotMark(mark ?? { x: region.rect.x + region.rect.w / 2, y: region.rect.y + region.rect.h / 2 });
    const correct = region.correct ?? false;
    if (correct) setCorrectCount((c) => c + 1);
    track("appraise_answer", { artifactId, questionId: question.id, correct: correct ? 1 : 0 });
    setPickedId(region.id);
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
    <div className="appraise-gate">
      <AnimatePresence mode="wait">
        {phase === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="appraise-opening"
          >
            <picture className="appraise-opening__background" aria-hidden="true">
              <source media="(min-width: 640px)" srcSet="images/history/appraise-opening-desktop.webp" />
              <img src="images/history/appraise-opening-mobile.webp" alt="" width="941" height="1672" draggable={false} fetchPriority="high" />
            </picture>
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
              className="appraise-opening__copy max-w-md"
            />
          </motion.div>
        )}

        {(phase === "questions" || phase === "seal") && question && (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="appraise-question-stage"
          >
            <AppraiseQuestionPanel
              questions={data.questions}
              index={qIndex}
              referenceImage={referenceImage}
              pickedId={pickedId}
              picked={picked}
              pickedSpot={pickedSpot}
              spotMark={spotMark}
              onPick={pick}
              onPickSpot={pickSpot}
              onPickRegion={pickRegion}
              onNext={advance}
              completion={phase === "seal" ? {
                rankTitle: rank.title,
                rankLine: rank.line,
                sealLine: data.sealLine,
                continueLabel: data.nextLabel ?? "看看我经历了多久 →",
                onDone,
              } : undefined}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
