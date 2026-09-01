import { motion } from "framer-motion";
import type { ChatMessage as ChatMessageType } from "../../types/artifact";

interface ChatMessageProps {
  message: ChatMessageType;
}

const BASIS_LABEL: Record<string, { label: string; dot: string }> = {
  verified: { label: "已知史实", dot: "bg-bronze-light" },
  inferred: { label: "合理推测", dot: "bg-gilt-light" },
  unknown: { label: "资料未载", dot: "bg-cinnabar-light" },
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-[13.5px] leading-6 ${
            isUser
              ? "bg-gilt/20 text-rice-50"
              : "border border-rice-100/10 bg-ink-800/70 text-rice-100/90"
          }`}
        >
          {message.content || (
            <span className="inline-flex gap-1 py-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rice-100/50" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rice-100/50 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rice-100/50 [animation-delay:300ms]" />
            </span>
          )}
        </div>
        {!isUser && message.factBasis && message.content && (
          <div className="mt-1 flex items-center gap-1.5 px-1">
            <span className={`h-1.5 w-1.5 rounded-full ${BASIS_LABEL[message.factBasis].dot}`} />
            <span className="text-[10px] tracking-wide text-rice-200/40">
              {BASIS_LABEL[message.factBasis].label}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
