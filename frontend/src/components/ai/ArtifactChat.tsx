import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameStore } from "../../store/gameStore";
import { getArtifact } from "../../data/artifacts";
import { streamArtifactReply } from "../../services/aiService";
import { captureChatContext } from "../../utils/chatContext";
import { classifyQuestion } from "../../utils/factGuard";
import { getStoryQuestions } from "../../utils/storyQuestions";
import { track } from "../../utils/tracking";
import type { AIAction, ArtifactContext, ChatTurnContext } from "../../types/artifact";
import ChatSheet from "./ChatSheet";
import FloatingAIButton from "./FloatingAIButton";
import EvidenceExplorer from "./EvidenceExplorer";
import { getChatDiscoveryQuestions, validateEvidenceAction } from "../../utils/evidenceActions";

/** 对话独立挂载；打开、收起均不改变舞台或幕内组件的 key。 */
export default function ArtifactChat() {
  const stage = useGameStore((s) => s.stage);
  const chatOpen = useGameStore((s) => s.chatOpen);
  const messages = useGameStore((s) => s.chatMessages);
  const loading = useGameStore((s) => s.chatLoading);
  const hasNewReply = useGameStore((s) => s.chatHasNewReply);
  const pending = useGameStore((s) => s.pendingChatQuestion);
  const moment = useGameStore((s) => s.storyMoment);
  const discovered = useGameStore((s) => s.discoveredDetails);
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const chapterIndex = useGameStore((s) => s.chapterIndex);
  const toggleChat = useGameStore((s) => s.toggleChat);
  const [draft, setDraft] = useState("");
  const [evidenceAction, setEvidenceAction] = useState<AIAction | null>(null);
  const requestRef = useRef<{ controller: AbortController; messageId: string } | null>(null);
  const scrollPosition = useRef(Number.POSITIVE_INFINITY);
  const artifact = getArtifact(artifactId);
  const currentContext = captureChatContext(artifact, chapterIndex, useGameStore.getState().currentScene(), discovered, moment);
  const asked = messages.filter((m) => m.role === "user").map((m) => m.content);
  const questions = getChatDiscoveryQuestions(artifact, getStoryQuestions(artifact, moment, asked), asked);

  useEffect(() => {
    if (!chatOpen || evidenceAction?.artifactId !== artifactId) setEvidenceAction(null);
  }, [chatOpen, artifactId, evidenceAction]);

  const send = useCallback(async (text: string, mode: "short" | "deep" = "short", savedContext?: ChatTurnContext) => {
    const state = useGameStore.getState();
    const question = text.trim();
    if (!question || state.chatLoading) return;
    const currentArtifact = getArtifact(state.currentArtifactId);
    const turnContext = savedContext ?? captureChatContext(currentArtifact, state.chapterIndex, state.currentScene(), state.discoveredDetails, state.storyMoment);
    const userId = crypto.randomUUID();
    const replyId = crypto.randomUUID();
    const userMessage = { id: userId, role: "user" as const, content: question, answerMode: mode, createdAt: Date.now() };
    state.addMessage(userMessage);
    state.addMessage({ id: replyId, role: "artifact", content: "", question, answerMode: mode, turnContext, createdAt: Date.now() });
    state.setChatLoading(true);
    setDraft("");
    scrollPosition.current = Number.POSITIVE_INFINITY;
    const controller = new AbortController();
    requestRef.current = { controller, messageId: replyId };
    const context: ArtifactContext = {
      artifact: currentArtifact,
      verifiedFacts: currentArtifact.verifiedFacts,
      timeline: currentArtifact.timeline,
      ...turnContext,
      answerMode: mode,
      conversationHistory: [...state.chatMessages.filter((m) => m.content && !m.error), userMessage],
    };
    const isCurrent = () => requestRef.current?.messageId === replyId && useGameStore.getState().currentArtifactId === currentArtifact.id && !controller.signal.aborted;
    try {
      await streamArtifactReply(context, question, {
        onToken: (content) => { if (isCurrent()) useGameStore.getState().patchMessage(replyId, { content }); },
        onDone: (content, factBasis, metadata) => {
          if (!isCurrent()) return;
          useGameStore.getState().completeChatReply(replyId, { content, factBasis, factIds: metadata?.factIds ?? [], suggestedActions: metadata?.suggestedActions ?? [], replySource: metadata?.source });
          track("chat_reply", { artifactId: currentArtifact.id, questionKind: classifyQuestion(question), factBasis, answerMode: mode, momentId: turnContext.storyMoment?.id ?? "free" });
        },
      }, controller.signal);
    } catch {
      if (isCurrent()) useGameStore.getState().patchMessage(replyId, { content: "这次没能完成回答，可以再试一次。", error: true });
    } finally {
      if (requestRef.current?.messageId === replyId) {
        requestRef.current = null;
        useGameStore.getState().setChatLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const state = useGameStore.getState();
    if (!chatOpen || !pending || state.chatLoading || !state.pendingChatQuestion) return;
    const question = state.pendingChatQuestion;
    state.clearPendingChatQuestion();
    void send(question);
  }, [chatOpen, pending, loading, send]);

  useEffect(() => () => {
    requestRef.current?.controller.abort();
    requestRef.current = null;
    useGameStore.getState().setChatLoading(false);
  }, [artifactId]);

  const stop = () => {
    const request = requestRef.current;
    if (!request) return;
    request.controller.abort();
    const message = useGameStore.getState().chatMessages.find((m) => m.id === request.messageId);
    useGameStore.getState().patchMessage(request.messageId, { content: message?.content || "回答已暂停。", error: true });
    requestRef.current = null;
    useGameStore.getState().setChatLoading(false);
  };

  if (stage === "museum" || stage === "gallery" || stage === "epilogue") return null;
  return <>
    <FloatingAIButton artifactName={artifact.name} hidden={chatOpen} hasNewReply={hasNewReply} onClick={() => toggleChat(true)} />
    <AnimatePresence>
      {chatOpen && <ChatSheet key={artifactId} artifact={artifact} context={currentContext} messages={messages} questions={questions}
        loading={loading} draft={draft} onDraft={setDraft} scrollPosition={scrollPosition}
        onSend={(question) => { void send(question); }}
        onDeepDive={(message) => { if (message.question) void send(message.question, "deep", message.turnContext); }}
        onRetry={(message) => { if (message.question) void send(message.question, message.answerMode, message.turnContext); }}
        onExplore={(message, candidate) => {
          const action = validateEvidenceAction(artifact, candidate, message.factIds ?? [], message.content);
          if (action) setEvidenceAction(action);
        }}
        onStop={stop} onClose={() => toggleChat(false)} />}
    </AnimatePresence>
    {chatOpen && evidenceAction?.artifactId === artifactId && <EvidenceExplorer key={`${evidenceAction.type}:${evidenceAction.targetId}`} artifact={artifact} action={evidenceAction}
      onBack={() => setEvidenceAction(null)} onReturnStory={() => { setEvidenceAction(null); toggleChat(false); }} />}
  </>;
}
