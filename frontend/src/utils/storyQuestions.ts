import type { Artifact, InscriptionSection, StoryFollowUp, StoryMoment } from "../types/artifact";

/** 标点与引号不同不构成一个新问题。 */
const questionKey = (text: string) => text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "").toLowerCase();

/** 阅读概念优先；主动查看「考」才转向本段考据，字形说明不补通用题。 */
export function getInscriptionFollowUp(section: InscriptionSection | undefined, debateOpen: boolean, sourceOpen: boolean) {
  if (!section || sourceOpen) return undefined;
  return debateOpen ? section.debateNote ? section.debateFollowUp : undefined : section.followUp;
}

/** 精选问题的离线回答与推荐配置放在同一处，避免改题后答案失配。 */
export function getConfiguredFollowUp(artifact: Artifact, question: string): StoryFollowUp | undefined {
  const followUps = artifact.hotspots.flatMap((hotspot) => hotspot.followUp ? [hotspot.followUp] : []);
  for (const chapter of artifact.chapters) {
    const module = chapter.module;
    if ("followUp" in module && module.followUp) followUps.push(module.followUp);
    const nodes = module.kind === "qa" ? module.items : module.kind === "inscription" ? module.sections : module.kind === "flip" ? module.cards : [];
    for (const node of nodes) {
      if (node.followUp) followUps.push(node.followUp);
      if ("debateFollowUp" in node && node.debateFollowUp) followUps.push(node.debateFollowUp);
    }
  }
  const key = questionKey(question);
  return followUps.find((followUp) => followUp.questions.some((q) => questionKey(q) === key)
    && followUp.factIds.length > 0
    && followUp.factIds.every((id) => artifact.verifiedFacts.some((fact) => fact.id === id && fact.source.trim())));
}

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
