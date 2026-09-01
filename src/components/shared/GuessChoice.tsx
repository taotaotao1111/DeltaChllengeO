import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface GuessOption {
  id: string;
  label: string;
  /** 选择后的第一人称回应，不需要判定"对错"，只需要给出更接近事实的引导 */
  response: string;
}

interface GuessChoiceProps {
  question: string;
  options: GuessOption[];
  onDone?: (optionId: string) => void;
  continueLabel?: string;
  className?: string;
}

/**
 * 一个轻量的"猜一猜"交互：抛出一个开放式问题 + 几个选项，
 * 用户做出判断后，文物给出回应——不是评分对错，而是把回应当成继续讲下去的钩子。
 *
 * 设计原则：每个选项都值得被认真回应，用户永远不会"选错"到没有下文。
 */
export default function GuessChoice({
  question,
  options,
  onDone,
  continueLabel = "继续 →",
  className = "",
}: GuessChoiceProps) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = options.find((o) => o.id === pickedId) ?? null;

  return (
    <div className={`flex w-full flex-col items-center text-center ${className}`}>
      <AnimatePresence mode="wait">
        {!picked ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <p className="font-title mb-6 text-lg leading-relaxed text-rice-100 sm:text-xl">
              {question}
            </p>
            <div className="flex flex-col items-stretch gap-2.5 sm:items-center">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPickedId(opt.id)}
                  className="rounded-full border border-gilt/30 bg-ink-800/40 px-5 py-2.5 text-sm text-rice-100/90 transition hover:border-gilt/50 hover:bg-gilt/10"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <p className="mb-2 text-xs tracking-widest text-gilt-light/60">你选了「{picked.label}」</p>
            <p className="font-title mb-7 text-lg leading-relaxed text-rice-100 sm:text-xl">
              {picked.response}
            </p>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => onDone?.(picked.id)}
              className="rounded-full bg-gilt/20 px-6 py-2.5 text-sm tracking-wide text-gilt-light transition hover:bg-gilt/30"
            >
              {continueLabel}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
