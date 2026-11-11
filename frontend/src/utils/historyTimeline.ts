import type { Artifact } from "../types/artifact";

export const historyPhaseKey = (id: string) => `history:phase:${id}`;

export function getInitialHistoryPhase(artifact: Artifact, chapterIndex: number, discovered: string[]) {
  const phases = artifact.historyEnding?.phases ?? [];
  const finished = artifact.chapters.every((chapter) => artifact.narrative?.optionalChapterIds.includes(chapter.id) || discovered.includes(`chapter:${chapter.id}`));
  if (finished) return phases[phases.length - 1]?.id ?? null;
  const chapterId = artifact.chapters[chapterIndex]?.id;
  return phases.find((phase) => phase.chapterIds?.includes(chapterId))?.id ?? phases[0]?.id ?? null;
}
