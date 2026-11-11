import type { Artifact, ChatMessage } from "../../types/artifact";
import { buildExplorationMemory } from "../../utils/explorationMemory";
import { evidenceVisitKey, getRegisteredEvidenceActions, resolveActionTarget } from "../../utils/evidenceActions";

export interface MemoryPosterData {
  identity: string;
  quote: string;
  discovery: string;
  discoveryLabel: string;
  stats: { count: number; unit: string; description: string }[];
  legacyLine: string | null;
  tracedGlyphs: { char: string; src: string }[];
  subject: string | null;
  fallbackSubject: string | null;
  date: string;
}

/** 海报是这次相遇的摘要：只引用真实看过的内容，不把固定示例当成个人经历。 */
export function buildMemoryPosterData(artifact: Artifact, discovered: string[], messages: ChatMessage[], options: {
  memoryLine?: string | null; legacyLine?: string | null; snapshot?: string | null;
  tracedGlyphs?: (string | null)[] | null; date: string;
}): MemoryPosterData {
  const memory = buildExplorationMemory(artifact, discovered, messages);
  const registry = getRegisteredEvidenceActions(artifact);
  const visited = discovered.flatMap((key) => registry.filter((action) => key === evidenceVisitKey(action.targetId)));
  const latest = visited[visited.length - 1];
  const hasInscription = discovered.includes("hotspot-inscription") || visited.some((action) => action.type === "FOCUS_INSCRIPTION");
  const hasPattern = discovered.includes("hotspot-pattern") || visited.some((action) => action.type === "FOCUS_HOTSPOT");
  let discovery = memory.insight;
  if (artifact.id === "hezun") {
    if (latest?.type === "OPEN_TIMELINE") discovery = "1963 年被发现，1965 年入藏，1975 年发现铭文。原来，被找到与被读懂，是不同的相遇。";
    else if (hasInscription) discovery = "原来，「宅兹中国」中的「中国」，需要放在西周初年的语境里理解，不能直接等同于今天的国家概念。";
    else if (hasPattern) discovery = "兽面纹的样子可以看见，寓意却不能只凭图案确定。观察和解释之间，还需要证据。";
    else if (discovered.includes("hotspot-form")) discovery = "原来，「尊」是一类青铜礼器的名称。它的器形、纹饰与用途，让我离那个时代近了一点。";
  }
  const topics = [...new Set(memory.questions.flatMap((question) => /中国|铭文|文字/.test(question) ? ["文字与历史"]
    : /纹|工艺|铸造/.test(question) ? ["纹饰与工艺"] : /发现|出土|入藏/.test(question) ? ["发现的经过"] : ["文物的往事"]))];
  return {
    identity: `${artifact.name} · ${artifact.dynasty}`,
    quote: options.memoryLine || (artifact.id === "hezun" ? "我不是一件青铜器，\n我是一个时代\n留下的证据。" : artifact.memoryLines[0]),
    discovery,
    discoveryLabel: memory.details.length || memory.evidence.length ? "我的一次发现" : "我的相遇小记",
    stats: [
      { count: memory.details.length, unit: "处细节", description: memory.details.length ? memory.details.slice(0, 2).join("、") : "从这一次相遇开始" },
      { count: memory.questions.length, unit: "次追问", description: topics.length ? topics.slice(0, 2).join(" · ") : "还有故事，等我来问" },
      { count: memory.evidence.length, unit: "份证据", description: memory.evidence.length ? `亲自查看「${resolveActionTarget(artifact, latest!)!.target.label}」` : "下一次，沿着问题求证" },
    ],
    legacyLine: options.legacyLine?.trim() || null,
    tracedGlyphs: (options.tracedGlyphs ?? []).flatMap((src, i) => src ? [{ char: artifact.traceGlyphs?.chars[i] ?? `${i + 1}`, src }] : []),
    subject: options.snapshot ?? null,
    fallbackSubject: artifact.id === "hezun" ? "images/memory/hezun-green.webp" : artifact.images.avatar ?? null,
    date: options.date,
  };
}
