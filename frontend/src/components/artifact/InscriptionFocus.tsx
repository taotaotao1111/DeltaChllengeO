import { Fragment, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Fact } from "../../types/artifact";

interface InscriptionFocusProps {
  open: boolean;
  /** 逐字浮现的关键字 */
  characters: string[];
  /** 字浮现完之后的说明，一句一行 */
  explainLines: string[];
  facts: Fact[];
  /** 说明旁的实物配图（可选，如「宅兹中国」文创摆件照片）；caption 走档案 */
  sideImage?: { src: string; caption?: string };
  onClose: () => void;
}

/**
 * 铭文特写 —— 全 Demo 情绪高潮之一。
 * 背景变暗，镜头/文字聚焦，关键的几个字逐字浮现。
 */
export default function InscriptionFocus({
  open,
  characters,
  explainLines,
  facts,
  sideImage,
  onClose,
}: InscriptionFocusProps) {
  const [revealCount, setRevealCount] = useState(0);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    if (!open) {
      setRevealCount(0);
      setShowExplain(false);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    characters.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealCount(i + 1), 500 + i * 650));
    });
    timers.push(setTimeout(() => setShowExplain(true), 500 + characters.length * 650 + 500));
    return () => timers.forEach(clearTimeout);
  }, [open, characters]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          /* /98 这种非标准刻度 Tailwind 不生成（背景全透明、底下章节标题透出）——只能用 /95 */
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto overscroll-contain bg-ink-900/95 px-6 pb-[calc(4rem+var(--safe-bottom))] pt-[calc(5rem+var(--safe-top))]"
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
            {characters.map((ch, i) => (
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
                className="mt-10 flex max-w-lg flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8"
              >
                {/* 实物配图：文字走到「这句话活到了今天」之后，给一件今天的东西看 */}
                {sideImage && (
                  <motion.figure
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="w-52 shrink-0 sm:w-60"
                  >
                    <img
                      src={sideImage.src}
                      alt={sideImage.caption ?? "「宅兹中国」文创摆件"}
                      className="w-full rounded-md border border-gilt/25 shadow-[0_10px_36px_rgba(0,0,0,0.6)]"
                    />
                    {sideImage.caption && (
                      <figcaption className="mt-2 text-[10px] leading-4 text-rice-200/40">
                        {sideImage.caption}
                      </figcaption>
                    )}
                  </motion.figure>
                )}
                <div className="max-w-md text-center sm:text-left">
                  <p className="text-sm leading-7 text-rice-200/80">
                    {explainLines.map((line, i) => (
                      <Fragment key={i}>
                        {i > 0 && <br />}
                        {line}
                      </Fragment>
                    ))}
                  </p>
                  {facts.length > 0 && (
                    <p className="mt-3 text-xs text-rice-200/40">
                      来源：{facts.map((f) => f.source).join("；")}
                    </p>
                  )}
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={onClose}
                      className="mt-8 rounded-full border border-gilt/40 px-6 py-2 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/10"
                    >
                      我记住了
                    </button>
                  </div>
                </div>
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
