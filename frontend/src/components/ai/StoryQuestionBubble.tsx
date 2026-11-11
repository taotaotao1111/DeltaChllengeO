import { motion } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { getArtifact } from "../../data/artifacts";
import { getStoryQuestions } from "../../utils/storyQuestions";

/** 只在模块明确提供的停顿点出现，绝不自动打开对话。 */
export default function StoryQuestionBubble({ compact = false, inline = false, variant = "default" }: {
  compact?: boolean; inline?: boolean; variant?: "default" | "story" | "evidence" | "history";
}) {
  const moment = useGameStore((s) => s.storyMoment);
  const askArtifact = useGameStore((s) => s.askArtifact);
  const loading = useGameStore((s) => s.chatLoading);
  const messages = useGameStore((s) => s.chatMessages);
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const dismissed = useGameStore((s) => s.dismissedStoryMomentIds);
  if (!moment?.ready || chatOpen || dismissed.includes(moment.id)) return null;
  const asked = messages.filter((m) => m.role === "user").map((m) => m.content);
  const questions = getStoryQuestions(getArtifact(artifactId), moment, asked).slice(0, compact ? 1 : 2);
  if (!questions.length) return null;
  const prompt = moment.prompt ?? "关于刚才的发现，问问 AI";
  if (variant === "story" || variant === "evidence") return <motion.aside initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    aria-label={`AI 追问：${prompt}`} className="pointer-events-auto w-full">
    <button type="button" disabled={loading} onClick={(event) => { event.stopPropagation(); askArtifact(questions[0]); }}
      aria-label={`问 AI：${questions[0]}`}
      className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition disabled:opacity-40 sm:px-4 sm:py-3.5 ${variant === "evidence" ? "border border-gilt/50 bg-[#14110d] [@media(hover:hover)]:hover:border-gilt-light/75" : "bg-[#34291b] [@media(hover:hover)]:hover:bg-[#403221]"}`}>
      <svg className="h-5 w-5 shrink-0 text-gilt-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
        <path d="m10 4 2.2 6.8L19 13l-6.8 2.2L10 22l-2.2-6.8L1 13l6.8-2.2L10 4Z" /><circle cx="19" cy="4" r="2" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-[11px] leading-5 text-gilt-light/80">{prompt}</span>
        <span className="block text-sm leading-6 text-rice-100/90">{questions[0]}</span>
      </span>
      <span className="shrink-0 text-gilt-light" aria-hidden="true">↗</span>
    </button>
  </motion.aside>;
  return (
    <motion.aside initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      aria-label={`AI 追问：${prompt}`} className={`pointer-events-auto w-full max-w-md text-left ${inline ? "" : `rounded-2xl border border-gilt/30 p-3 sm:p-4 ${variant === "history" ? "bg-[#14110d]" : "bg-gilt/[0.07]"}`}`}>
      {!inline && <p className="mb-2 flex items-center gap-2 text-[11px] tracking-wide text-gilt-light/75">
        {variant === "history" ? <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m10 4 2.2 6.8L19 13l-6.8 2.2L10 22l-2.2-6.8L1 13l6.8-2.2L10 4Z" /><circle cx="19" cy="4" r="2" /></svg> : <span aria-hidden="true">✧</span>}
        <span>AI 追问 · {prompt}</span>
      </p>}
      <div className="space-y-2">
        {questions.map((question) => <button key={question} disabled={loading} onClick={(e) => { e.stopPropagation(); askArtifact(question); }}
          aria-label={`问 AI：${question}`}
          className={`flex min-h-11 w-full items-center justify-between gap-3 py-2.5 text-left text-xs leading-6 transition disabled:opacity-40 sm:text-sm ${inline ? "text-gilt-light hover:text-gilt-light/80" : variant === "history" ? "rounded-xl bg-[#302619] px-3 font-semibold text-rice-100/90 hover:bg-[#3b2e1e]" : "rounded-xl bg-gilt/10 px-3 text-rice-100/90 hover:bg-gilt/20"}`}>
          <span>{inline && <span aria-hidden="true" className="mr-2">✧</span>}{question}</span><span aria-hidden className="shrink-0 text-gilt-light">↗</span>
        </button>)}
      </div>
    </motion.aside>
  );
}
