import type { AIAction, Artifact, InscriptionModuleData, InscriptionSection } from "../types/artifact";

/** 在真实选段中定位证据关键词；返回原铭文字序，不按示意字形或屏幕列号猜位置。 */
export function getInscriptionEvidenceRange(module: InscriptionModuleData, section: InscriptionSection, text: string): [number, number] | null {
  const term = text.replace(/[\p{P}\p{Z}\s]/gu, "");
  if (!term) return null;
  const offset = module.fullText.slice(...section.range).join("").indexOf(term);
  return offset < 0 ? null : [section.range[0] + offset, section.range[0] + offset + [...term].length];
}

export function resolveEvidenceTarget(artifact: Artifact, targetId: string) {
  const target = artifact.evidenceGuide?.targets.find((item) => item.sectionId === targetId);
  if (!target || !target.factIds.length) return null;
  const chapter = artifact.chapters.find((item) => item.id === target.chapterId);
  if (chapter?.module.kind !== "inscription") return null;
  const module: InscriptionModuleData = chapter.module;
  const section: InscriptionSection | undefined = module.sections.find((item) => item.id === target.sectionId);
  if (!section || section.range[0] < 0 || section.range[1] > module.fullText.length) return null;
  const plain = (text: string) => text.replace(/[\p{P}\p{Z}\s]/gu, "");
  if (!plain(module.fullText.slice(...section.range).join("")).includes(plain(target.excerpt))) return null;
  if (!target.factIds.every((id) => section.factIds.includes(id)
    && artifact.verifiedFacts.some((fact) => fact.id === id && fact.confidence === "verified" && fact.source.trim()))) return null;
  return { target, module, section };
}

export function getEvidenceTargets(artifact: Artifact) {
  return (artifact.evidenceGuide?.targets ?? []).flatMap((target) => {
    const resolved = resolveEvidenceTarget(artifact, target.sectionId);
    return resolved ? [resolved] : [];
  });
}

/** 不仅校验合法 ID，还要求回答引用相应资料，并实际提及目标内容。 */
export function validateEvidenceAction(artifact: Artifact, value: unknown, referencedFactIds: string[], answer: string): AIAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AIAction>;
  if (candidate.type !== "FOCUS_INSCRIPTION" || candidate.artifactId !== artifact.id || typeof candidate.targetId !== "string") return null;
  const resolved = resolveEvidenceTarget(artifact, candidate.targetId);
  if (!resolved || !Array.isArray(candidate.factIds)) return null;
  const { target } = resolved;
  if (!candidate.factIds.every((id) => typeof id === "string" && target.factIds.includes(id) && referencedFactIds.includes(id))) return null;
  if (!target.factIds.every((id) => candidate.factIds!.includes(id) && referencedFactIds.includes(id))) return null;
  if (!target.answerTerms.some((term) => answer.includes(term))) return null;
  return { type: "FOCUS_INSCRIPTION", artifactId: artifact.id, targetId: target.sectionId, factIds: [...target.factIds] };
}

/** 兼容旧文本响应或本地档案回答：仅从回答已经关联的真实证据生成一个建议。 */
export function deriveEvidenceActions(artifact: Artifact, answer: string, factIds: string[]): AIAction[] {
  for (const { target } of getEvidenceTargets(artifact)) {
    const action = validateEvidenceAction(artifact, { type: "FOCUS_INSCRIPTION", artifactId: artifact.id, targetId: target.sectionId, factIds: target.factIds }, factIds, answer);
    if (action) return [action];
  }
  return [];
}

const importanceIntent = /重要|特别|价值|意义|珍贵|独特|值得.{0,4}(收藏|记住)|[和与].{0,12}(青铜|铜器).{0,8}(不同|不一样)/;
export function getEvidenceIntent(artifact: Artifact, question: string): "importance" | "meaning" | null {
  if (!getEvidenceTargets(artifact).length || /灵魂|意识|孤独|害怕|假如|假设/.test(question)) return null;
  if (question.includes("中国")) return "meaning";
  if (/纹饰|扉棱|饕餮|器型|圈足|蕉叶|工匠|成周|铸造/.test(question)) return null;
  // 让“这段为什么重要”留在当前段落，不自动把所有重要性问题归到同一个目标。
  const artifactScope = question.includes(artifact.name) || question.includes("你") || /^(为什么|为何|为啥).{0,3}(值得|这么重要|这么特别)|^有什么特别/.test(question);
  if (artifactScope && !/这段|这个字|这句话|这件事/.test(question) && importanceIntent.test(question)) return "importance";
  return null;
}

export function getEvidenceIntentFactIds(artifact: Artifact, question: string) {
  return getEvidenceIntent(artifact, question) ? [...getEvidenceTargets(artifact)[0].target.factIds] : [];
}

export function getEvidenceIntentAnswer(artifact: Artifact, question: string) {
  const intent = getEvidenceIntent(artifact, question);
  if (intent === "importance") return artifact.evidenceGuide?.answer;
  if (intent === "meaning") {
    const target = getEvidenceTargets(artifact)[0].target;
    return `${target.interpretation}不能直接等同于今天的国家概念。`;
  }
  return undefined;
}

export function getChatDiscoveryQuestions(artifact: Artifact, contextual: string[], asked: string[]) {
  const entry = artifact.evidenceGuide?.question;
  return !asked.length && entry && getEvidenceTargets(artifact).length
    ? [entry, ...contextual.filter((question) => question !== entry)].slice(0, 3)
    : contextual.slice(0, 3);
}

export const evidenceVisitKey = (targetId: string) => `ai:evidence:${targetId}`;

/** 输出协议仅对配置了证据目标的文物启用，模型只能在登记表内提出建议。 */
export function buildEvidenceActionPrompt(artifact: Artifact) {
  const targets = getEvidenceTargets(artifact).map(({ target }) => ({ type: "FOCUS_INSCRIPTION", artifactId: artifact.id, targetId: target.sectionId, factIds: target.factIds, label: target.label }));
  if (!targets.length) return "";
  return `\n【本轮结构化输出】\n输出一个 JSON 对象，不要 Markdown 代码围栏：{"answer":"完整的简体中文回答","factIds":["回答实际依据的资料编号"],"suggestedActions":[]}。answer 遵守上面的篇幅与史实边界。factIds 只选 VERIFIED_FACTS 中的真实编号。\n仅当回答实际解释了下列目标且引用其全部 factIds 时，suggestedActions 才可包含一个登记的动作（去掉 label 字段）；否则为空数组。不得虚构目标、链接、代码或 DOM 操作；普通情感问题不需要动作。\n可用目标：${JSON.stringify(targets)}\n用户问文物的重要性、独特价值时，可结合相关铭文证据回答；仍需如实指出解释边界。`;
}

export function decodeEvidenceReply(raw: string, artifact: Artifact) {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!text.startsWith("{")) return { answer: raw.trim(), factIds: undefined, suggestedActions: [] as AIAction[] };
  const parsed = JSON.parse(text) as { answer?: unknown; factIds?: unknown; suggestedActions?: unknown };
  if (typeof parsed.answer !== "string" || !parsed.answer.trim()) throw new Error("Incomplete AI response");
  const answer = parsed.answer.trim();
  const factIds: string[] = Array.isArray(parsed.factIds)
    ? [...new Set(parsed.factIds.filter((id): id is string => typeof id === "string" && artifact.verifiedFacts.some((fact) => fact.id === id && fact.source.trim())))] : [];
  const suggestedActions = Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions.flatMap((value) => {
    const action = validateEvidenceAction(artifact, value, factIds, answer);
    return action ? [action] : [];
  }).slice(0, 1) : [];
  return { answer, factIds, suggestedActions };
}
