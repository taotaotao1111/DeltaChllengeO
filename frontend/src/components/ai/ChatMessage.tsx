import { motion } from "framer-motion";
import { useState } from "react";
import type { AIAction, Artifact, ChatMessage as Message, Fact } from "../../types/artifact";
import { getEvidenceActionPresentation, validateEvidenceAction } from "../../utils/evidenceActions";

interface Props {
  artifact: Artifact;
  message: Message;
  facts: Fact[];
  sourcesOpen: boolean;
  loading: boolean;
  onSources: () => void;
  onDeepDive: () => void;
  onRetry: () => void;
  onExplore: (action: AIAction) => void;
}

const LABELS = { verified: "参考已核实资料", inferred: "涉及合理推测", unknown: "资料未载" };

export default function ChatMessage({ artifact, message, facts, sourcesOpen, loading, onSources, onDeepDive, onRetry, onExplore }: Props) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const isUser = message.role === "user";
  const complete = !isUser && !!message.factBasis && !!message.content && !message.error;
  const action = complete && message.factBasis !== "unknown" ? (message.suggestedActions ?? []).flatMap((candidate) => {
    const valid = validateEvidenceAction(artifact, candidate, message.factIds ?? [], message.content);
    return valid ? [valid] : [];
  })[0] : undefined;
  const actionPresentation = action ? getEvidenceActionPresentation(artifact, action) : null;
  return <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
    {!isUser && <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gilt/35 bg-[#211b13] text-xs text-gilt-light">
      {artifact.images.avatar && !avatarFailed
        ? <img src={artifact.images.avatar} alt="" width={28} height={28} loading="lazy" onError={() => setAvatarFailed(true)} className="h-full w-full object-cover" />
        : artifact.name.slice(0, 1)}
    </span>}
    <div className={`flex min-w-0 flex-col ${isUser ? "max-w-[92%] items-end" : "flex-1 items-start"}`}>
      {!isUser && <p className="mb-1 px-1 text-[11px] leading-4 text-gilt-light/70">{artifact.name}</p>}
      {message.answerMode === "deep" && <p className="mb-1 px-1 text-[10px] text-gilt-light/60">深入了解</p>}
      <div className={`max-w-full whitespace-pre-line break-words rounded-2xl px-4 py-3 text-sm leading-7 ${isUser ? "bg-gilt/20 text-rice-50" : "border border-rice-100/10 bg-ink-800/75 text-rice-100/90"}`}>
        {message.content || <span className="inline-flex gap-1 py-2" aria-label="正在回答"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gilt-light/60" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gilt-light/60 [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gilt-light/60 [animation-delay:300ms]" /></span>}
      </div>
      {complete && <>
        <p className="mt-1.5 px-1 text-[10px] text-rice-200/45">{message.replySource === "local" ? "本地档案回答 · " : ""}{LABELS[message.factBasis!]}</p>
        {action && actionPresentation && <button type="button" disabled={loading} onClick={() => onExplore(action)}
          className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-gilt/35 bg-gilt/10 px-3 py-2.5 text-left text-gilt-light transition hover:bg-gilt/20 disabled:opacity-40">
          <span><span className="block text-sm">{actionPresentation.label}</span><span className="mt-1 block text-[10px] text-gilt-light/60">{actionPresentation.detail}</span></span>
          <span aria-hidden="true">↗</span>
        </button>}
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
