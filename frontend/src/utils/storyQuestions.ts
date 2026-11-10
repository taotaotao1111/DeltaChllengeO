import type { Artifact, StoryMoment } from "../types/artifact";

/** 标点与引号不同不构成一个新问题。 */
const questionKey = (text: string) => text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "").toLowerCase();

/** 没有节点配置、没有资料、已经问过，均不补回章节通用题。 */
export function getStoryQuestions(artifact: Artifact, moment: StoryMoment | null, asked: string[] = []) {
  if (!moment?.ready || !moment.factIds.length) return [];
  const sources = moment.factIds.map((id) => artifact.verifiedFacts.find((fact) => fact.id === id));
  if (sources.some((fact) => !fact?.source.trim()) || !sources.some((fact) => fact?.confidence === "verified")) return [];
  const excluded = new Set([...asked, ...(moment.blockedQuestions ?? [])].map(questionKey));
  return moment.questions.filter((question) => {
    const key = questionKey(question);
    if (!key || excluded.has(key)) return false;
    excluded.add(key);
    return true;
  });
}
