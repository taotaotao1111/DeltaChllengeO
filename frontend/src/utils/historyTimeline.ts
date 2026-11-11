import type { Artifact } from "../types/artifact";

export const historyPhaseKey = (id: string) => `history:phase:${id}`;

export function getInitialHistoryPhase(artifact: Artifact, chapterIndex: number) {
  const phases = artifact.historyEnding?.phases ?? [];
  // 已读完主线不等于想看“今天”；进入时间线仍与当前阅读的故事对应。
  const chapterId = artifact.chapters[chapterIndex]?.id;
  return phases.find((phase) => phase.chapterIds?.includes(chapterId))?.id ?? phases[0]?.id ?? null;
}
