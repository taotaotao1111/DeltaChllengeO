import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (q: string) => void;
  disabled?: boolean;
}

export default function SuggestedQuestions({
  questions,
  onSelect,
  disabled,
}: SuggestedQuestionsProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-rice-100/10 px-4 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-2 text-xs tracking-wide text-gilt-light/70 transition hover:text-gilt-light"
      >
        {open ? "你现在最想知道什么？ ▲" : "你现在最想知道什么？ ▼"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="scrollbar-none flex gap-2 overflow-x-auto pb-3"
          >
            {questions.map((q) => (
              <button
                key={q}
                disabled={disabled}
                onClick={() => onSelect(q)}
                className="shrink-0 rounded-full border border-rice-100/15 px-3.5 py-1.5 text-xs text-rice-100/75 transition hover:border-gilt/40 hover:text-gilt-light disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
