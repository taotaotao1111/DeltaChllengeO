import type { Artifact, ChatMessage } from "../types/artifact";
import { getStoryActs } from "./narrative";

/** 只从真实记录派生纪念内容，不把章节标记、时间线浏览计为器身细节。 */
export function buildExplorationMemory(artifact: Artifact, discovered: string[], messages: ChatMessage[]) {
  const details = artifact.hotspots.filter((h) => h.type !== "timeline" && discovered.includes(h.id));
  const completed = getStoryActs(artifact).filter((act) => act.mainIndices.length > 0 && act.mainIndices.every((i) => discovered.includes(`chapter:${artifact.chapters[i].id}`)));
  const questions = [...new Set(messages.filter((m) => m.role === "user" && m.content.trim()).map((m) => m.content.trim()))];
  const insights = artifact.insights.find((i) => i.requires.length > 0 && i.requires.every((id) => discovered.includes(id)));
  return {
    details: details.map((h) => h.title),
    completed: completed.map((act) => `${act.label} · ${act.title}`),
    storyUnit: artifact.narrative ? "幕" : "段",
    questions,
    insight: insights?.text ?? (details.length ? details[0].story : "这次相遇，从你停下来的这一刻开始。"),
    insightLabel: insights || details.length ? "这次记住的一点" : "相遇小记",
  };
}
