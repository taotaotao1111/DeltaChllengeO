import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SpeechReveal from "../../shared/SpeechReveal";
import ArtifactPresence from "../../artifact/ArtifactPresence";
import InscriptionFocus from "../../artifact/InscriptionFocus";
import RustReveal from "../../artifact/RustReveal";
import GuessChoice from "../../shared/GuessChoice";
import { useGameStore } from "../../../store/gameStore";
import type { Artifact, ArtifactChapter, RevealModuleData } from "../../../types/artifact";

type Phase = "lead-in" | "derust" | "focus" | "guess" | "closing";

interface RevealModuleProps {
  artifact: Artifact;
  data: RevealModuleData;
  presence?: ArtifactChapter["presence"];
  onNext: () => void;
}

/**
 * 揭示模块：听说有字 → 亲手擦出字影 → 看清并读懂 → 先猜一次 → 收尾。
 *
 * 中间三步都可选：没有除锈素材的文物会从念白直接进特写，没有关键字的直接进竞猜。
 */
export default function RevealModule({ artifact, data, presence, onNext }: RevealModuleProps) {
  const [phase, setPhase] = useState<Phase>("lead-in");
  const toggleChat = useGameStore((s) => s.toggleChat);
  const markDiscovered = useGameStore((s) => s.markDiscovered);

  /** 实际会经过的步骤，跳过没有素材的那些 */
  const steps = useMemo<Phase[]>(
    () => [
      "lead-in",
      ...(data.derust ? (["derust"] as const) : []),
      ...(data.focus ? (["focus"] as const) : []),
      ...(data.guess ? (["guess"] as const) : []),
      "closing",
    ],
    [data.derust, data.focus, data.guess],
  );

  const advance = () => {
    const i = steps.indexOf(phase);
    setPhase(steps[Math.min(i + 1, steps.length - 1)]);
  };

  // 关键字特写看完（进入竞猜）就算探索过了，不必等到收尾
  useEffect(() => {
    if (!data.marksDiscovered) return;
    if (phase === "guess" || phase === "closing") markDiscovered(data.marksDiscovered);
  }, [phase, markDiscovered, data.marksDiscovered]);

  const focusFacts = data.focus
    ? artifact.verifiedFacts.filter((f) => data.focus!.factIds.includes(f.id))
    : [];

  return (
    <>
      {/*
        除锈与特写这两步画面中央已经有实物/大字了，再放一尊会打架，
        所以讲述者只在"说话的段落"出现（引入、竞猜、收尾）。
      */}
      {presence && (phase === "lead-in" || phase === "guess" || phase === "closing") && (
        <ArtifactPresence artifact={artifact} opacity={presence.opacity} className={presence.className} />
      )}

      {phase === "lead-in" && (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <SpeechReveal
            lines={data.leadInLines}
            lineDelay={data.lineDelay}
            onComplete={advance}
            className="max-w-md"
            textClassName="font-title text-xl leading-relaxed text-rice-100 sm:text-2xl"
          />
        </div>
      )}

      {phase === "derust" && data.derust && (
        <RustReveal
          leadLines={data.derust.leadLines}
          footnote={data.derust.footnote}
          onRevealed={advance}
        />
      )}

      {data.focus && (
        <InscriptionFocus
          open={phase === "focus"}
          characters={data.focus.characters}
          explainLines={data.focus.explainLines}
          facts={focusFacts}
          onClose={advance}
        />
      )}

      {phase === "guess" && data.guess && (
        <div className="flex h-full w-full items-center justify-center px-6">
          <GuessChoice
            question={data.guess.question}
            options={data.guess.options}
            onDone={advance}
          />
        </div>
      )}

      {phase === "closing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
        >
          <SpeechReveal
            lines={data.closingLines}
            lineDelay={data.lineDelay}
            className="mb-10 max-w-lg"
            textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
            onComplete={() => {}}
          />

          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, duration: 0.7 }}
              className="flex flex-wrap justify-center gap-3"
            >
              <button
                onClick={() => toggleChat(true)}
                className="rounded-full bg-gilt/25 px-6 py-2.5 text-sm tracking-wide text-gilt-light shadow-[0_0_24px_rgba(201,167,106,0.15)] transition hover:bg-gilt/35"
              >
                问问我
              </button>
              <button
                onClick={onNext}
                className="rounded-full border border-rice-100/20 px-6 py-2.5 text-sm tracking-wide text-rice-100/80 transition hover:border-rice-100/40 hover:text-rice-100"
              >
                看看我经历了多久 →
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
