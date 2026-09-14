import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../../shared/SpeechReveal";
import ArtifactPresence from "../../artifact/ArtifactPresence";
import { useGameStore } from "../../../store/gameStore";
import type { Artifact, ArtifactChapter, QaModuleData } from "../../../types/artifact";

type QA = QaModuleData["items"][number];

interface QaModuleProps {
  artifact: Artifact;
  data: QaModuleData;
  presence?: ArtifactChapter["presence"];
  onNext: () => void;
}

/**
 * 问答模块：念白铺陈完，交给用户挑「你想先听哪一个」。
 *
 * 炉火氛围与火星在 ChapterBackdrop（由 ChapterHost 提供），这里不能再铺
 * bg-ink-900 或全屏渐变——否则会把背景母题和背后的文物整层盖掉。
 */
export default function QaModule({ artifact, data, presence, onNext }: QaModuleProps) {
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const [introDone, setIntroDone] = useState(false);
  const [activeQA, setActiveQA] = useState<QA | null>(null);
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    markDiscovered("history");
  }, [markDiscovered]);

  const handleAsk = (qa: QA) => {
    setActiveQA(qa);
    setVisited((v) => (v.includes(qa.id) ? v : [...v, qa.id]));
  };

  return (
    <>
      {presence && (
        <ArtifactPresence artifact={artifact} opacity={presence.opacity} className={presence.className} />
      )}

      <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-6">
        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          {!introDone ? (
            <SpeechReveal
              lines={data.openingLines}
              lineDelay={data.lineDelay}
              onComplete={() => setIntroDone(true)}
              textClassName="font-title text-xl leading-relaxed text-rice-100 sm:text-2xl"
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              <AnimatePresence mode="wait">
                {activeQA ? (
                  <motion.div
                    key={activeQA.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 rounded-2xl border border-gilt/15 bg-ink-800/50 p-6 text-left backdrop-blur-sm"
                  >
                    <p className="mb-2 text-xs tracking-widest text-cinnabar-light/80">
                      {activeQA.question}
                    </p>
                    <p className="text-sm leading-7 text-rice-100/90">{activeQA.answer}</p>
                  </motion.div>
                ) : (
                  <p className="mb-8 text-sm text-rice-200/60">{data.prompt}</p>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap justify-center gap-2.5">
                {data.items.map((qa) => (
                  <button
                    key={qa.id}
                    onClick={() => handleAsk(qa)}
                    className={`rounded-full border px-4 py-2 text-xs transition ${
                      visited.includes(qa.id)
                        ? "border-gilt/40 text-gilt-light/70"
                        : "border-rice-100/20 text-rice-100/80 hover:border-gilt/40 hover:text-gilt-light"
                    }`}
                  >
                    {qa.question}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {visited.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={onNext}
                    className="mt-7 rounded-full bg-gilt/20 px-5 py-2.5 text-xs tracking-wide text-gilt-light transition hover:bg-gilt/30"
                  >
                    继续听我说 →
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
