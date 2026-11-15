import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GuessOption } from "./GuessChoice";
import "./InscriptionChoice.css";

interface InscriptionChoiceProps {
  question: string;
  options: GuessOption[];
  picked: GuessOption | null;
  onPick: (id: string) => void;
  onDone?: (id: string) => void;
  continueLabel: string;
  className?: string;
}

/** 意象剪影只作装饰，不使用真实疆域或把场景当作考古复原。 */
function ChoiceLandscape({ kind }: { kind: GuessOption["illustration"] }) {
  return (
    <svg className="inscription-choice__landscape" viewBox="0 0 224 80" fill="none" aria-hidden="true">
      <path d="m0 79 25-17 23 6 29-23 28 13 19-8 26 13 31-21 43 19v19H0Z" fill="currentColor" opacity=".2" />
      <path d="m0 80 40-9 30 4 36-9 32 7 38-10 48 9v8H0Z" fill="currentColor" opacity=".32" />
      {kind === "modern-city" ? (
        <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M99 69V43h13v26m6 0V32h15v37m6 0V21h13v48m6 0V41h15v28m6 0V35h14v34m7 0V49h12v20" fill="currentColor" fillOpacity=".2" />
          <path d="M145.5 21V9m-5 14h10M122 40h7m-7 7h7m-7 7h7m33-5h7m-7 7h7m19-13h6m-6 7h6M86 70h135" opacity=".7" />
        </g>
      ) : kind === "royal-capital" ? (
        <g stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
          <path d="m103 65 10-8h84l10 8H103Zm11-9 8-8h67l8 8h-83Zm10-9 9-8h48l9 8h-66Z" fill="currentColor" fillOpacity=".32" />
          <path d="M134 39v-9h46v9M129 30c10-2 17-5 28-11 10 6 18 9 28 11h-56Zm28-11v-5m-39 43v8m16-17v9m45-9v9m15 0v8M94 71h122" fill="currentColor" fillOpacity=".25" />
          <path d="m151 34 6-3 6 3m-6-3v8m-24 27 13-5h22l13 5m-34 1h20" opacity=".6" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M98 70V49h12v-6h10v6h13V39h12v-6h11v6h12v10h13v-6h10v6h13v21H98Z" fill="currentColor" fillOpacity=".24" />
          <path d="M141 70V58a10 10 0 0 1 20 0v12M130 38c8-3 15-7 21-11 8 5 14 9 22 11h-43Zm21-11v-7M101 55h32m35 0h33M107 61h8m7 0h8m42 0h8m7 0h8M89 73h125" fill="currentColor" fillOpacity=".2" />
        </g>
      )}
    </svg>
  );
}

function CloudPattern() {
  return (
    <svg className="inscription-choice__cloud" viewBox="0 0 112 64" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true">
      <path d="M-7 4h42c9 0 13 5 13 11S44 26 38 26H19v-9h16m-42-7h39c6 0 10 2 10 6s-3 5-7 5H24m-31 12h28c12 0 16 6 16 13s-5 13-14 13H0V43h19v7H9m-16-11h27c7 0 12 3 12 8s-4 7-10 7H5" />
      <path d="M47-6v12c0 9 5 13 12 13h13v-9H59m-6-16v12c0 5 3 8 8 8h6M39 70V43c0-11 7-17 17-17h20c8 0 13 4 13 10s-4 11-10 11H61v-9h16m-32 32V44c0-8 5-12 13-12h17c5 0 8 2 8 5s-2 5-6 5H66m-15 28V47m7 23V54h20c12 0 19-7 19-18s-7-17-19-17h-2M86-5v14h22m-15-14v7h15" />
    </svg>
  );
}

export default function InscriptionChoice({ question, options, picked, onPick, onDone, continueLabel, className = "" }: InscriptionChoiceProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <section className={`inscription-choice ${className}`} aria-labelledby={titleId}>
      <picture className="inscription-choice__frame" aria-hidden="true">
        <source media="(min-width: 640px)" srcSet="images/history/inscription-choice-desktop.webp" />
        <img src="images/history/inscription-choice-mobile.webp" alt="" width="840" height="1120" decoding="async" draggable={false} />
      </picture>
      <div className="inscription-choice__content">
        <AnimatePresence mode="wait" initial={false}>
          {!picked ? (
            <motion.div
              key="question"
              className="inscription-choice__question"
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={{ duration: reduceMotion ? 0 : .22 }}
            >
              <h2 id={titleId} className="inscription-choice__title">{question}</h2>
              <p className="inscription-choice__invitation">先留下你的猜想，再听我慢慢讲来。</p>
              <div className="inscription-choice__options" role="group" aria-labelledby={titleId}>
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="inscription-choice__option"
                    disabled={picked !== null}
                    onClick={() => onPick(option.id)}
                  >
                    <CloudPattern />
                    <ChoiceLandscape kind={option.illustration} />
                    <span className="inscription-choice__label">{option.label}</span>
                    <span className="inscription-choice__diamond" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="response"
              className="inscription-choice__response"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : .35 }}
              onAnimationComplete={() => document.getElementById(titleId)?.focus({ preventScroll: true })}
            >
              <h2 id={titleId} className="inscription-choice__response-title" tabIndex={-1}>你选了「{picked.label}」</h2>
              <p className="inscription-choice__answer">{picked.response}</p>
              <button type="button" className="inscription-choice__continue" onClick={() => onDone?.(picked.id)}>{continueLabel}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
