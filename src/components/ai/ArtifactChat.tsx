import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { hezun } from "../../data/artifacts/hezun";
import { streamArtifactReply } from "../../services/aiService";
import ChatMessage from "./ChatMessage";
import SuggestedQuestions from "./SuggestedQuestions";
import type { ArtifactContext, ChatMessage as ChatMessageType } from "../../types/artifact";

const OPENING_MESSAGE =
  "你可以问我任何关于「我」的问题。\n我知道的，会告诉你；我不知道的，也会告诉你。";

export default function ArtifactChat() {
  const stage = useGameStore((s) => s.stage);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const toggleChat = useGameStore((s) => s.toggleChat);
  const messages = useGameStore((s) => s.chatMessages);
  const addMessage = useGameStore((s) => s.addMessage);
  const patchLastMessage = useGameStore((s) => s.patchLastMessage);
  const chatLoading = useGameStore((s) => s.chatLoading);
  const setChatLoading = useGameStore((s) => s.setChatLoading);
  const discoveredDetails = useGameStore((s) => s.discoveredDetails);
  const currentScene = useGameStore((s) => s.currentScene);
  const openMemoryCard = useGameStore((s) => s.openMemoryCard);

  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messages.length === 0 && chatOpen) {
      addMessage({
        id: "opening",
        role: "artifact",
        content: OPENING_MESSAGE,
        createdAt: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatLoading]);

  if (stage === "museum" || stage === "gallery") return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessageType = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    addMessage(userMsg);
    setInput("");

    const artifactMsg: ChatMessageType = {
      id: `a-${Date.now()}`,
      role: "artifact",
      content: "",
      createdAt: Date.now(),
    };
    addMessage(artifactMsg);
    setChatLoading(true);

    const context: ArtifactContext = {
      artifact: hezun,
      verifiedFacts: hezun.verifiedFacts,
      timeline: hezun.timeline,
      currentScene: currentScene(),
      discoveredDetails,
      conversationHistory: [...messages, userMsg],
    };

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    await streamArtifactReply(
      context,
      trimmed,
      {
        onToken: (partial) => patchLastMessage({ content: partial }),
        onDone: (full, factBasis) => {
          patchLastMessage({ content: full, factBasis });
          setChatLoading(false);
        },
        onError: () => setChatLoading(false),
      },
      controller.signal,
    );
  };

  return (
    <>
      {/* 悬浮入口 */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.3 }}
            onClick={() => toggleChat(true)}
            className="fixed bottom-[calc(1.5rem+var(--safe-bottom))] right-[calc(1.5rem+var(--safe-right))] z-40 flex items-center gap-2 rounded-full border border-gilt/30 bg-ink-900/80 px-5 py-3 text-sm text-gilt-light shadow-[0_0_30px_rgba(201,167,106,0.15)] backdrop-blur-md transition hover:bg-ink-800/90 sm:bottom-8 sm:right-8"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gilt-light animate-pulse" />
            问问我
          </motion.button>
        )}
      </AnimatePresence>

      {/* 聊天抽屉 */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink-900/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => toggleChat(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-2xl border border-gilt/20 bg-ink-900/95 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[400px] sm:rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-rice-100/10 px-5 py-3 pt-[calc(0.75rem+var(--safe-top))] sm:pt-3">
                <div>
                  <p className="font-title text-base text-rice-100">{hezun.name}</p>
                  <p className="text-[11px] text-rice-200/40">正在与你对话</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openMemoryCard()}
                    className="rounded-full px-2.5 py-2 text-xs text-gilt-light/80 transition hover:text-gilt-light"
                  >
                    生成记忆卡
                  </button>
                  <button
                    onClick={() => toggleChat(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-rice-200/50 transition hover:text-rice-100"
                    aria-label="关闭"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div ref={listRef} className="scrollbar-none flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} />
                ))}
              </div>

              <SuggestedQuestions
                questions={hezun.suggestedQuestions}
                onSelect={send}
                disabled={chatLoading}
              />
              <p className="px-4 pb-1 text-[11px] text-rice-200/35">或者，你自己问——</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2 p-3 pb-[calc(0.75rem+var(--safe-bottom))]"
              >
                {/* input 有默认的固有宽度，光 flex-1 不会真的收缩，会把发送按钮挤出容器；
                    min-w-0 让它可以缩，shrink-0 保证按钮永远完整 */}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="想问问我什么？"
                  className="min-w-0 flex-1 rounded-full border border-rice-100/15 bg-ink-800/60 px-4 py-2.5 text-base text-rice-100 outline-none placeholder:text-rice-200/30 focus:border-gilt/40 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !input.trim()}
                  className="shrink-0 whitespace-nowrap rounded-full bg-gilt/25 px-4 py-2.5 text-sm text-gilt-light transition hover:bg-gilt/35 disabled:opacity-30"
                >
                  发送
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
