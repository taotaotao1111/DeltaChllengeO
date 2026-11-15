import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SpeechReveal from "../../shared/SpeechReveal";
import ArtifactPresence from "../../artifact/ArtifactPresence";
import InscriptionFocus from "../../artifact/InscriptionFocus";
import RustReveal from "../../artifact/RustReveal";
import RustCompare from "../../artifact/RustCompare";
import GuessChoice from "../../shared/GuessChoice";
import { useGameStore } from "../../../store/gameStore";
import type { Artifact, ArtifactChapter, RevealModuleData } from "../../../types/artifact";
import { useStoryMoment } from "../../../utils/useStoryMoment";
import StoryQuestionBubble from "../../ai/StoryQuestionBubble";
import { getRevealSteps, type RevealPhase } from "../../../utils/revealFlow";

interface RevealModuleProps {
  artifact: Artifact;
  data: RevealModuleData;
  presence?: ArtifactChapter["presence"];
  onNext: () => void;
  onDeepDive?: () => void;
  initialPhase?: "lead-in" | "closing";
}

/**
 * 揭示模块：听说有字 → 亲手擦出字影 → 看清并读懂 → 先猜一次 → 收尾。
 *
 * 可精简说明和配图，关键文字的揭示始终在含义竞猜之前。
 */
export default function RevealModule({ artifact, data, presence, onNext, onDeepDive, initialPhase = "lead-in" }: RevealModuleProps) {
  const [phase, setPhase] = useState<RevealPhase>(initialPhase);
  const markDiscovered = useGameStore((s) => s.markDiscovered);
  const [closingReady, setClosingReady] = useState(false);
  const showFocus = !!data.focus?.characters.length;
  useStoryMoment({
    id: `${artifact.id}:reveal:${phase}`,
    title: phase === "closing" || phase === "guess" || phase === "focus" ? "铭文初现 · 宅兹中国" : "除锈发现",
    summary: phase === "closing" ? [...(data.focus?.explainLines ?? []), ...data.closingLines].join("\n") : phase === "guess" || phase === "focus" ? data.focus?.explainLines.join("\n") ?? "" : data.leadInLines.join("\n"),
    factIds: phase === "closing" || phase === "guess" || phase === "focus" ? [...new Set([...(data.focus?.factIds ?? []), ...(data.followUp?.factIds ?? [])])] : [],
    questions: data.followUp?.questions ?? [],
    prompt: data.followUp?.prompt,
    ready: phase === "closing" && closingReady,
  });

  const steps = getRevealSteps(data);

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
          underImageSrc={data.derust.underImageSrc}
          coverImageSrc={data.derust.coverImageSrc}
          onRevealed={advance}
        />
      )}

      {phase === "compare" && data.compare && (
        <RustCompare
          beforeSrc={data.compare.beforeSrc}
          afterSrc={data.compare.afterSrc}
          caption={data.compare.caption}
          onDone={advance}
          nextLabel={data.compare.nextLabel}
        />
      )}

      {showFocus && data.focus && (
        <InscriptionFocus
          open={phase === "focus"}
          characters={data.focus.characters}
          explainLines={data.focus.explainLines}
          facts={focusFacts}
          sideImage={data.focus.sideImage}
          charactersOnly={data.focus.showPage === false}
          continueLabel={data.focus.showPage === false ? data.focus.nextLabel ?? (data.guess ? "猜猜这句话的意思 →" : "继续故事 →") : undefined}
          onClose={advance}
        />
      )}

      {phase === "guess" && data.guess && (
        <div className={data.guess.presentation === "inscription" ? "inscription-guess-stage" : "flex h-full w-full items-center justify-center px-6"}>
          <GuessChoice
            question={data.guess.question}
            options={data.guess.options}
            presentation={data.guess.presentation}
            onDone={advance}
          />
        </div>
      )}

      {phase === "closing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex h-full w-full flex-col items-center overflow-y-auto overscroll-contain px-6 pb-28 pt-[calc(10rem+var(--safe-top))] text-center sm:justify-center"
        >
          <SpeechReveal
            lines={data.closingLines}
            onComplete={() => setClosingReady(true)}
            lineDelay={data.lineDelay}
            className="mb-6 max-w-lg"
            textClassName="font-title text-lg leading-relaxed text-rice-100 sm:text-xl"
            reveal={
              <div className="w-full">
                <div className="mb-4 flex justify-center"><StoryQuestionBubble compact variant="evidence" /></div>
                {onDeepDive && <p className="mb-4 text-xs leading-6 text-rice-200/60">秘密已经读懂。接着听我的故事，或留步读完这 122 个字。</p>}
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={onNext}
                  className="rounded-full bg-gilt/20 px-6 py-2.5 text-sm tracking-wide text-gilt-light shadow-[0_0_24px_rgba(201,167,106,0.15)] transition hover:bg-gilt/35"
                >
                  {onDeepDive ? "继续故事 →" : data.nextLabel ?? "看看我经历了多久 →"}
                </button>
                {onDeepDive && (
                  <button onClick={onDeepDive} className="rounded-full border border-gilt/35 px-6 py-2.5 text-sm text-rice-100/85 transition hover:bg-gilt/10">
                    展开完整铭文
                  </button>
                )}
                </div>
              </div>
            }
            revealPlaceholderH={onDeepDive ? 280 : 180}
          />
        </motion.div>
      )}
    </>
  );
}
