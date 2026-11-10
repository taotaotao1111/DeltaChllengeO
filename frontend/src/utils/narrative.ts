import type { Artifact } from "../types/artifact";

/** 原始章节索引始终保留，兼容续读；主线前后移动只跳过自选深入内容。 */
export function getMainChapterIndices(artifact: Artifact): number[] {
  return artifact.chapters.flatMap((chapter, index) =>
    artifact.narrative?.optionalChapterIds.includes(chapter.id) ? [] : [index],
  );
}

export function getChapterAct(artifact: Artifact, index: number) {
  const id = artifact.chapters[index]?.id;
  return artifact.narrative?.acts.find((act) => act.chapterIds.includes(id));
}

/** 用户目录只呈现幕；原有内容节点作为幕内段落，自选深入单独挂在所属幕下。 */
export function getStoryActs(artifact: Artifact) {
  if (!artifact.narrative) return artifact.chapters.map((chapter, index) => ({
    id: chapter.id,
    label: chapter.label,
    title: chapter.title,
    chapterIndices: [index],
    mainIndices: [index],
    optionalIndices: [] as number[],
  }));
  return artifact.narrative.acts.map((act) => {
    const chapterIndices = artifact.chapters.flatMap((chapter, index) => act.chapterIds.includes(chapter.id) ? [index] : []);
    return {
      ...act,
      chapterIndices,
      mainIndices: chapterIndices.filter((i) => !artifact.narrative!.optionalChapterIds.includes(artifact.chapters[i].id)),
      optionalIndices: chapterIndices.filter((i) => artifact.narrative!.optionalChapterIds.includes(artifact.chapters[i].id)),
    };
  });
}

export function getAdjacentChapter(artifact: Artifact, index: number, direction: 1 | -1) {
  const indices = getMainChapterIndices(artifact);
  return direction === 1
    ? indices.find((i) => i > index)
    : [...indices].reverse().find((i) => i < index);
}
