import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../shared/SpeechReveal";

interface MuseumIntroProps {
  onComplete: () => void;
}

/**
 * 第三句是刻意加的：前两句只负责氛围，用户看完并不知道自己接下来要做什么。
 * 这一句把事情说清楚（选一件、听它讲），也正好接上展厅那句「今夜，你想认识谁？」。
 */
const LINES = ["闭馆以后，", "它们终于可以说话了。", "今夜，选一件，听它讲自己的一生。"];

/**
 * 开场：完全黑暗中的第一句话。
 *
 * 念完不自动跳走，而是等用户主动推门——把"开始"这个动作交回给用户，
 * 免得一段独白刚读到一半场景就换了。任何时候都可以从右上角跳过。
 */
export default function MuseumIntro({ onComplete }: MuseumIntroProps) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <SpeechReveal
        lines={LINES}
        lineDelay={2200}
        onComplete={() => setReady(true)}
        className="max-w-md"
        textClassName="font-title text-xl leading-relaxed text-rice-100/90 sm:text-2xl"
      />

      <AnimatePresence>
        {ready && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            onClick={onComplete}
            className="mt-12 rounded-full border border-gilt/40 bg-ink-900/40 px-7 py-3 text-sm tracking-wide text-gilt-light shadow-[0_0_30px_rgba(201,167,106,0.12)] backdrop-blur-sm transition hover:bg-gilt/10"
          >
            推门进去 →
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        whileHover={{ opacity: 0.8 }}
        transition={{ delay: 1.2 }}
        onClick={onComplete}
        className="fixed right-[calc(1.5rem+var(--safe-right))] top-[calc(1.5rem+var(--safe-top))] text-xs tracking-wide text-rice-100/60"
      >
        跳过 →
      </motion.button>
    </div>
  );
}
