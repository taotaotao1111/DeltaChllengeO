import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SpeechRevealProps {
  lines: string[];
  /** 每行停留时长（ms），会按文字长度做一点微调 */
  lineDelay?: number;
  onComplete?: () => void;
  className?: string;
  textClassName?: string;
  /** 是否在最后一行后保持显示（不触发 onComplete 后自动清空) */
  holdLast?: boolean;
}

/**
 * 逐句显现的对白组件：一次只显示一句，停顿后切换到下一句。
 * 点击/点按可以跳过等待，立即进入下一句——避免用户觉得"被迫等待"。
 */
export default function SpeechReveal({
  lines,
  lineDelay = 2200,
  onComplete,
  className = "",
  textClassName = "",
  holdLast = true,
}: SpeechRevealProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setIndex(0);
  }, [lines]);

  useEffect(() => {
    if (index >= lines.length) return;
    const isLast = index === lines.length - 1;
    const delay = Math.max(lineDelay, lines[index].length * 90);

    if (isLast) {
      timerRef.current = setTimeout(() => {
        if (!doneRef.current) {
          doneRef.current = true;
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
      if (timerRef.current) clearTimeout(timerRef.current);
      onComplete?.();
    }
  };

  const visibleIndex = holdLast ? Math.min(index, lines.length - 1) : index;

  return (
    <div className={`cursor-pointer select-none ${className}`} onClick={advance}>
      <AnimatePresence mode="wait">
        <motion.p
          key={visibleIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={textClassName}
        >
          {lines[visibleIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
