import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

interface SpeechRevealProps {
  lines: string[];
  /** 每行停留时长（ms），会按文字长度做一点微调 */
  lineDelay?: number;
  onComplete?: () => void;
  className?: string;
  textClassName?: string;
  /** 是否在最后一行后保持显示（不触发 onComplete 后自动清空) */
  holdLast?: boolean;
  /**
   * 跟随讲述进度的后续内容：讲述未完成时渲染占位高度（防按钮位置跳动），
   * 完成后淡入。用于 closing 相位的「问问我 / 继续」按钮——
   * 出现时机必须挂在 onComplete 上，不能用固定延时
   * （lineDelay 调快后固定延时会比讲述先到，按钮抢在第二句前出现）。
   */
  reveal?: ReactNode;
  /** reveal 区占位高度（px）；不传默认 3rem（一排按钮的高度） */
  revealPlaceholderH?: number;
}

/**
 * 逐句显现的对白组件：读过的句子向上收小变暗，当前句保持全大——
 * 像一行行往上滚动的独白，读者随时能看到上文。
 * 点击/点按可以跳过等待，立即进入下一句——避免用户觉得"被迫等待"。
 */
export default function SpeechReveal({
  lines,
  lineDelay = 1500,
  onComplete,
  className = "",
  textClassName = "",
  holdLast = true,
  reveal = null,
  revealPlaceholderH = 48,
}: SpeechRevealProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setIndex(0);
    setRevealed(false);
  }, [lines]);

  useEffect(() => {
    if (index >= lines.length) return;
    const isLast = index === lines.length - 1;
    const delay = Math.max(lineDelay, lines[index].length * 60);

    if (isLast) {
      timerRef.current = setTimeout(() => {
        if (!doneRef.current) {
          doneRef.current = true;
          setRevealed(true);
          onComplete?.();
        }
      }, delay);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    timerRef.current = setTimeout(() => setIndex((i) => i + 1), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, lines, lineDelay]);

  const advance = () => {
    if (index < lines.length - 1) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIndex((i) => i + 1);
    } else if (!doneRef.current) {
      doneRef.current = true;
      setRevealed(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      onComplete?.();
    }
  };

  const visibleIndex = holdLast ? Math.min(index, lines.length - 1) : index;

  return (
    <div
      className={`flex cursor-pointer select-none flex-col items-center gap-2.5 ${className}`}
      onClick={advance}
    >
      {lines.slice(0, visibleIndex + 1).map((line, i) => {
        const isCurrent = i === visibleIndex;
        return (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 18, scale: 0.75 }}
            animate={
              isCurrent
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0.35, y: 0, scale: 0.72 }
            }
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={textClassName}
          >
            {line}
          </motion.p>
        );
      })}

      {/* 跟随讲述进度的后续内容（closing 的按钮等）：完成前用 min-height 占位
          （按钮位置不跳），完成后淡入。 */}
      {reveal && (
        <div className="mt-2 w-full" style={{ minHeight: revealPlaceholderH }}>
          {revealed ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex w-full justify-center"
            >
              {reveal}
            </motion.div>
          ) : null}
        </div>
      )}
    </div>
  );
}
