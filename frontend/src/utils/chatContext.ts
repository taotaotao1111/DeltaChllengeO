import type { Artifact, ArtifactContext, ChatMessage, ChatTurnContext, Scene, StoryMoment } from "../types/artifact";
import { findRelevantFacts } from "./factGuard";
import { getChapterAct } from "./narrative";

export function captureChatContext(artifact: Artifact, chapterIndex: number, scene: Scene, discovered: string[], moment: StoryMoment | null): ChatTurnContext {
  const act = getChapterAct(artifact, chapterIndex);
  return {
    currentScene: scene,
    currentChapterTitle: scene === "timeline" ? "我的一生" : artifact.chapters[chapterIndex]?.title,
    actTitle: scene === "timeline" ? "故事之后" : act ? `${act.label} · ${act.title}` : undefined,
    storyMoment: moment ? { ...moment, factIds: [...moment.factIds], questions: [...moment.questions], blockedQuestions: moment.blockedQuestions ? [...moment.blockedQuestions] : undefined } : undefined,
    discoveredDetails: [...discovered],
  };
}

/** 指代「这里、刚才」时优先在实际看到的资料中检索，避免要求用户重述场景。 */
export function getReplyFacts(context: ArtifactContext, question: string) {
  const momentFacts = context.verifiedFacts.filter((f) => context.storyMoment?.factIds.includes(f.id));
  // 精选追问必须携带节点配置的全部关联资料，如区分出土、入藏和释读的三次时间点。
  if (context.storyMoment?.questions.includes(question) && momentFacts.length > 0) return momentFacts.slice(0, 3);
  const scoped = /这里|这[几个处些段件]|刚才|这段|它/.test(question) && momentFacts.length > 0;
  const pool = scoped ? momentFacts : context.verifiedFacts;
  // 明确的主题词优先，避免「中国」问题仅因同字命中而列出器型、馆藏等资料。
  const tagged = pool.map((fact) => ({ fact, score: fact.tags.reduce((score, tag) => score + (tag.length >= 2 && question.includes(tag) ? tag.length ** 2 : 0), 0) }));
  const strongest = Math.max(0, ...tagged.map((item) => item.score));
  if (strongest > 0) return tagged.filter((item) => item.score === strongest).slice(0, 3).map((item) => item.fact);
  const matched = findRelevantFacts(question, pool, 3);
  return matched.length ? matched : scoped ? momentFacts.slice(0, 3) : [];
}

/** 超长返回按句收束；不为达到字数下限填充没有依据的内容。 */
export function limitReply(text: string, mode: "short" | "deep" = "short") {
  const max = mode === "deep" ? 360 : 120;
  const chars = Array.from(text.trim());
  if (chars.length <= max) return chars.join("");
  const prefix = chars.slice(0, max - 1).join("");
  const lastSentence = Math.max(prefix.lastIndexOf("。"), prefix.lastIndexOf("！"), prefix.lastIndexOf("？"));
  return lastSentence >= max / 2 ? prefix.slice(0, lastSentence + 1) : `${prefix}…`;
}

/** 当前问题由 API 单独传入，历史中不再重复追加一次。 */
export function buildChatHistory(messages: ChatMessage[], question: string) {
  const last = messages[messages.length - 1];
  const previous = last?.role === "user" && last.content === question ? messages.slice(0, -1) : messages;
  return previous.filter((m) => (m.role === "user" || m.role === "artifact") && m.content && !m.error).slice(-8).map((m) => ({
    role: m.role === "artifact" ? "assistant" : "user",
    content: m.content,
  }));
}
