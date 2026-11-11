import type { Artifact, ChatMessage } from "../types/artifact";
import { getStoryActs } from "./narrative";
import { evidenceVisitKey, getRegisteredEvidenceActions, resolveActionTarget } from "./evidenceActions";

/** 只从真实记录派生纪念内容，不把章节标记、时间线浏览计为器身细节。 */
export function buildExplorationMemory(artifact: Artifact, discovered: string[], messages: ChatMessage[]) {
  const details = artifact.hotspots.filter((h) => h.type !== "timeline" && discovered.includes(h.id));
  const completed = getStoryActs(artifact).filter((act) => act.mainIndices.length > 0 && act.mainIndices.every((i) => discovered.includes(`chapter:${artifact.chapters[i].id}`)));
  const questions = [...new Set(messages.filter((m) => m.role === "user" && m.content.trim()).map((m) => m.content.trim()))];
  const insights = artifact.insights.find((i) => i.requires.length > 0 && i.requires.every((id) => discovered.includes(id)));
  const visitedActions = getRegisteredEvidenceActions(artifact).filter((action) => discovered.includes(evidenceVisitKey(action.targetId)));
  const evidence = visitedActions.map((action) => resolveActionTarget(artifact, action)!.target.label);
  const onlyInscriptions = visitedActions.every((action) => action.type === "FOCUS_INSCRIPTION");
  return {
    details: details.map((h) => h.title),
    completed: completed.map((act) => `${act.label} · ${act.title}`),
    storyUnit: artifact.narrative ? "幕" : "段",
    questions,
    evidence,
    insight: evidence.length ? onlyInscriptions
      ? `你主动查看了「${evidence.join("、")}」对应的铭文证据，让这次提问多了一段可以回看、对照的文字。`
      : `你沿着提问查看了「${evidence.join("、")}」，为这次探索留下了可以重新观察、对照的具体内容。`
      : insights?.text ?? (details.length ? details[0].story : "这次相遇，从你停下来的这一刻开始。"),
    insightLabel: evidence.length ? "沿着问题找到的证据" : insights || details.length ? "这次记住的一点" : "相遇小记",
  };
}
