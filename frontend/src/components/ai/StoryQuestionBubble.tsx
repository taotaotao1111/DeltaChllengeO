import { motion } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { getArtifact } from "../../data/artifacts";
import { getStoryQuestions } from "../../utils/storyQuestions";

/** 只在模块明确提供的停顿点出现，绝不自动打开对话。 */
export default function StoryQuestionBubble({ compact = false }: { compact?: boolean }) {
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
  return (
    <motion.aside initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      aria-label={`AI 追问：${prompt}`} className="pointer-events-auto w-full max-w-md rounded-2xl border border-gilt/30 bg-gilt/[0.07] p-3 text-left sm:p-4">
      <p className="mb-2 text-[11px] tracking-wide text-gilt-light/75">✧ AI 追问 · {prompt}</p>
      <div className="space-y-2">
        {questions.map((question) => <button key={question} disabled={loading} onClick={(e) => { e.stopPropagation(); askArtifact(question); }}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-gilt/10 px-3 py-2.5 text-left text-xs leading-6 text-rice-100/90 transition hover:bg-gilt/20 disabled:opacity-40 sm:text-sm">
          <span>{question}</span><span aria-hidden className="shrink-0 text-gilt-light">↗</span>
        </button>)}
      </div>
    </motion.aside>
  );
}
