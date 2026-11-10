import { motion } from "framer-motion";
import type { ChatMessage as Message, Fact } from "../../types/artifact";

interface Props {
  message: Message;
  facts: Fact[];
  sourcesOpen: boolean;
  loading: boolean;
  onSources: () => void;
  onDeepDive: () => void;
  onRetry: () => void;
}

const LABELS = { verified: "参考已核实资料", inferred: "涉及合理推测", unknown: "资料未载" };

export default function ChatMessage({ message, facts, sourcesOpen, loading, onSources, onDeepDive, onRetry }: Props) {
  const isUser = message.role === "user";
  const complete = !isUser && !!message.factBasis && !!message.content && !message.error;
  return <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
    <div className={`flex max-w-[92%] flex-col ${isUser ? "items-end" : "items-start"}`}>
      {message.answerMode === "deep" && <p className="mb-1 px-1 text-[10px] text-gilt-light/60">深入了解</p>}
      <div className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-7 ${isUser ? "bg-gilt/20 text-rice-50" : "border border-rice-100/10 bg-ink-800/75 text-rice-100/90"}`}>
        {message.content || <span className="inline-flex gap-1 py-2" aria-label="正在回答"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gilt-light/60" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gilt-light/60 [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gilt-light/60 [animation-delay:300ms]" /></span>}
      </div>
      {complete && <>
        <p className="mt-1.5 px-1 text-[10px] text-rice-200/45">{message.replySource === "local" ? "本地档案回答 · " : ""}{LABELS[message.factBasis!]}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {message.answerMode !== "deep" && <button disabled={loading} onClick={onDeepDive} className="min-h-9 rounded-full border border-gilt/25 px-3 text-xs text-gilt-light disabled:opacity-40">深入了解 ↗</button>}
          <button onClick={onSources} aria-expanded={sourcesOpen} className="min-h-9 rounded-full border border-rice-100/20 px-3 text-xs text-rice-100/75">{sourcesOpen ? "收起依据" : "查看依据"}</button>
        </div>
      </>}
      {message.error && !isUser && <button disabled={loading} onClick={onRetry} className="mt-2 min-h-9 rounded-full border border-gilt/25 px-3 text-xs text-gilt-light disabled:opacity-40">重新回答</button>}
      {sourcesOpen && <div className="mt-3 w-full space-y-3 rounded-xl border border-gilt/20 bg-gilt/5 p-3">
        <p className="text-xs text-gilt-light/80">相关史料 · 供你对照阅读</p>
        {facts.length ? facts.map((fact, index) => <article key={fact.id} className="border-l border-gilt/30 pl-3">
          <p className="text-[10px] text-gilt-light/65">[{index + 1}] {fact.confidence === "verified" ? "已核实记载" : "合理推测"}</p>
          <p className="mt-1 text-xs leading-6 text-rice-100/80">{fact.content}</p>
          <p className="mt-1 text-[10px] leading-5 text-rice-200/55">来源：{fact.source}</p>
        </article>) : <p className="text-xs leading-6 text-rice-200/70">现有档案没有能明确回答这个问题的记载，不能把文学表达当成史实。</p>}
      </div>}
    </div>
  </motion.div>;
}
