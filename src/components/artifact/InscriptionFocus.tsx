import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Fact } from "../../types/artifact";

interface InscriptionFocusProps {
  open: boolean;
  facts: Fact[];
  onClose: () => void;
}

const CHARACTERS = ["宅", "兹", "中", "国"];

/**
 * 铭文特写 —— 全 Demo 情绪高潮之一。
 * 背景变暗，镜头/文字聚焦，"宅兹中国" 逐字浮现。
 */
export default function InscriptionFocus({ open, facts, onClose }: InscriptionFocusProps) {
  const [revealCount, setRevealCount] = useState(0);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    if (!open) {
      setRevealCount(0);
      setShowExplain(false);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    CHARACTERS.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealCount(i + 1), 500 + i * 650));
    });
    timers.push(setTimeout(() => setShowExplain(true), 500 + CHARACTERS.length * 650 + 500));
    return () => timers.forEach(clearTimeout);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-900/95 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gilt/10 blur-3xl" />

          <p className="mb-8 text-sm tracking-widest text-rice-200/60">
            我身上，有一句很重要的话。
          </p>

          <div className="flex gap-4 sm:gap-8">
            {CHARACTERS.map((ch, i) => (
              <motion.span
                key={ch}
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={
                  i < revealCount
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0, y: 20, filter: "blur(6px)" }
                }
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="font-title text-glow-gilt text-[13vw] leading-none text-gilt-light sm:text-6xl"
                style={{ textShadow: "0 2px 18px rgba(201,167,106,0.4)" }}
              >
                {ch}
              </motion.span>
            ))}
          </div>

          <AnimatePresence>
            {showExplain && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="mt-10 max-w-md text-center"
              >
                <p className="text-sm leading-7 text-rice-200/80">
                  这是何尊铭文中的一句，铭文全文共122字（含重文）。
                  <br />
                  「宅兹中国」，是目前所见「中国」二字连用的最早文字记录之一。
                </p>
                {facts.length > 0 && (
                  <p className="mt-3 text-xs text-rice-200/40">
                    来源：{facts.map((f) => f.source).join("；")}
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="mt-8 rounded-full border border-gilt/40 px-6 py-2 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/10"
                >
                  我记住了
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!showExplain && (
            <button
              onClick={onClose}
              className="absolute right-[calc(1rem+var(--safe-right))] top-[calc(1rem+var(--safe-top))] rounded-full px-3 py-2 text-xs text-rice-200/40 transition hover:text-rice-200/70"
            >
              跳过
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
