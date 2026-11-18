import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { AppraiseQuestion, AppraiseOption, AppraiseSpotRegion } from "../../types/artifact";
import AppraiseSeal, { type AppraiseSealProps } from "./AppraiseSeal";
import "../shared/InscriptionChoice.css";
import "./AppraiseGate.css";

interface AppraiseQuestionPanelProps {
  questions: AppraiseQuestion[];
  index: number;
  referenceImage?: string;
  pickedId: string | null;
  picked: AppraiseOption | null;
  pickedSpot: AppraiseSpotRegion | null;
  spotMark: { x: number; y: number } | null;
  onPick: (id: string) => void;
  onPickSpot: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPickRegion: (region: AppraiseSpotRegion) => void;
  onNext: () => void;
  completion?: AppraiseSealProps;
}

export default function AppraiseQuestionPanel({ questions, index, referenceImage, pickedId, picked, pickedSpot, spotMark, onPick, onPickSpot, onPickRegion, onNext, completion }: AppraiseQuestionPanelProps) {
  const titleId = useId();
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const referenceRef = useRef<HTMLImageElement>(null);
  const [readyReference, setReadyReference] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const question = questions[index];
  const answered = pickedId !== null;
  const answer = question.spot ? pickedSpot : picked;
  const showReference = !completion && !question.spot && !!referenceImage;

  // 保留同一个缩略图节点，且只显示已完成解码的图像。
  // 它不进入正文的 opacity/transform 动画，screen 始终与金框背景合成。
  useEffect(() => {
    const image = referenceRef.current;
    if (!showReference || !referenceImage || !image) return;
    let current = true;
    const reveal = async () => {
      try {
        await image.decode();
      } catch {
        // 解码未成功就保持占位，不展示带黑底的未就绪帧。
        return;
      }
      if (current && image.naturalWidth > 0) setReadyReference(referenceImage);
    };
    const onLoad = () => { void reveal(); };
    image.addEventListener("load", onLoad);
    if (image.complete && image.naturalWidth > 0) void reveal();
    return () => {
      current = false;
      image.removeEventListener("load", onLoad);
    };
  }, [referenceImage, showReference]);

  return (
    <section className="appraise-panel" aria-labelledby={completion ? undefined : titleId} aria-label={completion ? "验看完成" : undefined}>
      <picture className="inscription-choice__frame" aria-hidden="true">
        <source media="(min-width: 640px)" srcSet="images/history/inscription-choice-desktop.webp" />
        <img src="images/history/inscription-choice-mobile.webp" alt="" width="840" height="1120" draggable={false} />
      </picture>
      <div className="appraise-panel__content">
        <ol className="appraise-progress" aria-label="验看进度">
          {questions.map((step, i) => (
            <li key={step.id} className={completion || i < index ? "is-complete" : i === index ? "is-current" : ""} aria-current={!completion && i === index ? "step" : undefined}>
              <span className="appraise-progress__dot" aria-hidden="true">{completion || i < index ? "✓" : ""}</span>
              <span>{step.stepLabel ?? `验看 ${i + 1}`}</span>
            </li>
          ))}
        </ol>

        {showReference && (
          <div className={`appraise-reference${readyReference === referenceImage ? " is-ready" : ""}`} aria-label="本次验看的器物形制示意">
            <img ref={referenceRef} src={referenceImage} alt="本次验看的器身形制示意" width="96" height="144" decoding="async" draggable={false} />
            <span aria-hidden="true">器身 · 形制示意</span>
          </div>
        )}

        {/* 题目、缩略图和进度同步切换，不保留旧题退场，避免新布局中闪现上一题。 */}
        {completion ? <AppraiseSeal {...completion} /> : <div
          key={question.id}
          className={`appraise-question ${question.spot ? "appraise-question--spot" : "appraise-question--choice"}`}
        >
          <h2 className="appraise-question__title" id={titleId}>{question.question}</h2>

          {question.spot ? (
            <div className="appraise-spot-layout">
              <figure className="appraise-spot-figure">
                <div className={`appraise-spot-image ${answered ? "is-answered" : ""}`} onClick={onPickSpot}>
                  <img src={question.spot.imageSrc} alt="验看器物形制示意，可点选部位或使用下方部位按钮作答" width="400" height="600" draggable={false} />
                  {spotMark && <span className="appraise-spot-mark" style={{ left: `${spotMark.x * 100}%`, top: `${spotMark.y * 100}%` }} aria-hidden="true" />}
                </div>
                {question.spot.caption && <figcaption>{question.spot.caption}</figcaption>}
              </figure>
              <div className="appraise-spot-detail">
                {answered && answer ? (
                  <motion.div
                    className="appraise-feedback"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : .25 }}
                    onAnimationComplete={() => feedbackRef.current?.focus({ preventScroll: true })}
                  >
                    <p className="appraise-feedback__selection" ref={feedbackRef} tabIndex={-1}>你指了「{answer.label}」{answer.correct ? " · 答对了" : ""}</p>
                    <p className="appraise-feedback__copy">{answer.response}</p>
                    <button type="button" className="appraise-next" onClick={onNext}>{index === questions.length - 1 ? "盖印 →" : "继续验看 →"}</button>
                  </motion.div>
                ) : (
                  <div className="appraise-spot-invitation">
                    <small>点击器身，或选一处验看</small>
                    <div className="appraise-region-options" role="group" aria-label="选择先验看的部位">
                      {question.spot.regions.map((region, i) => (
                        <button key={region.id} type="button" onClick={() => onPickRegion(region)}>
                          <span className="appraise-region-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                          <span>{region.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="appraise-choice-area">
              {!answered ? (
                <div className="appraise-options" role="group" aria-labelledby={titleId}>
                  {question.options?.map((option, i) => (
                    <button key={option.id} type="button" onClick={() => onPick(option.id)} className="appraise-option">
                      <span className="appraise-option__number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                      <span>{option.label}</span>
                      <span className="appraise-option__ornament" aria-hidden="true">◇</span>
                    </button>
                  ))}
                </div>
              ) : answer && (
                <motion.div
                  className="appraise-feedback"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : .25 }}
                  onAnimationComplete={() => feedbackRef.current?.focus({ preventScroll: true })}
                >
                  <p className="appraise-feedback__selection" ref={feedbackRef} tabIndex={-1}>你选了「{answer.label}」{answer.correct ? " · 答对了" : ""}</p>
                  <p className="appraise-feedback__copy">{answer.response}</p>
                  <button type="button" className="appraise-next" onClick={onNext}>{index === questions.length - 1 ? "盖印 →" : "继续验看 →"}</button>
                </motion.div>
              )}
            </div>
          )}
        </div>}
      </div>
    </section>
  );
}
