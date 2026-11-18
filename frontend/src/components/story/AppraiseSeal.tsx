import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface AppraiseSealProps {
  rankTitle: string;
  rankLine: string;
  sealLine: string;
  continueLabel: string;
  onDone: () => void;
}

/** 盖印只替换金框内的正文，框体和已完成的验看进度持续保留。 */
export default function AppraiseSeal({ rankTitle, rankLine, sealLine, continueLabel, onDone }: AppraiseSealProps) {
  const reduceMotion = useReducedMotion();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="appraise-seal">
      <motion.div
        className="appraise-seal__stamp"
        initial={{ scale: reduceMotion ? 1 : 1.6, opacity: 0, rotate: reduceMotion ? -3.5 : -10 }}
        animate={{ scale: 1, opacity: 1, rotate: -3.5 }}
        transition={reduceMotion ? { duration: 0 } : { delay: .15, type: "spring", stiffness: 260, damping: 18 }}
        role="img"
        aria-label="验看无误印章"
      >
        <span aria-hidden="true">验</span><span aria-hidden="true">看</span>
        <span aria-hidden="true">无</span><span aria-hidden="true">误</span>
      </motion.div>
      <h2 className="appraise-seal__rank" ref={titleRef} tabIndex={-1}>{rankTitle}</h2>
      <p className="appraise-seal__rank-copy">{rankLine}</p>
      <p className="appraise-seal__copy">{sealLine}</p>
      <button type="button" className="appraise-next" onClick={onDone}>{continueLabel}</button>
    </div>
  );
}
