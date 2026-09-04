import type { ArtifactContext, Fact } from "../types/artifact";

/**
 * factGuard —— AI 回答的事实边界护栏
 *
 * 这个模块承担两件事：
 * 1. 根据用户问题，从 verifiedFacts 里检索出最相关的事实，供回答引用；
 * 2. 生成严格约束 AI 行为的 system prompt（供未来接入真实 LLM 时使用），
 *    以及在没有可用事实时的标准「未知」话术。
 */

const STOPWORDS = new Set([
  "的","了","吗","呢","是","你","我","他","她","它","这个","那个","一下","请","一个",
  "在","有","和","与","啊","么","嘛","呀","会","不会","为什么","怎么","什么","多少",
]);

function tokenize(text: string): string[] {
  return text
    .replace(/[，。？！、,.!?~～\s]/g, "")
    .split("")
    .filter((c) => !STOPWORDS.has(c) && c.trim().length > 0);
}

/** 简单的字符命中评分，避免引入额外分词依赖 */
export function findRelevantFacts(question: string, facts: Fact[], topN = 3): Fact[] {
  const qChars = tokenize(question);
  if (qChars.length === 0) return [];

  const scored = facts.map((fact) => {
    const haystack = fact.content + fact.tags.join("");
    let score = 0;
    for (const c of qChars) {
      if (haystack.includes(c)) score += 1;
    }
    // tag 精确命中额外加分
    for (const tag of fact.tags) {
      if (question.includes(tag)) score += 3;
    }
    return { fact, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.fact);
}

/** 未知问题的标准回应——克制、诚实，不猜测 */
export function unknownAnswerTemplate(): string {
  return [
    "这个问题，我没有办法替历史回答你。",
    "现有的资料，没有留下明确的答案。",
    "如果我说“是”，那就是我在替历史编故事了。",
  ].join("\n");
}

/** 供未来接入真实 LLM 时使用的系统提示词构造器 */
export function buildSystemPrompt(context: ArtifactContext): string {
  const { artifact, verifiedFacts, discoveredDetails, currentScene } = context;

  const factLines = verifiedFacts
    .map((f) => `- [${f.confidence.toUpperCase()}] ${f.content}（来源：${f.source}）`)
    .join("\n");

  return `你正在扮演一件真实存在的中国历史文物：${artifact.name}（${artifact.dynasty}）。

你的任务不是编故事，而是用人格化的方式解释真实历史。
你只能使用下面提供的 VERIFIED_FACTS 中的信息作为事实依据：

VERIFIED_FACTS:
${factLines}

当前场景：${currentScene}
用户已探索过：${discoveredDetails.join("、") || "（尚未探索）"}

规则（必须严格遵守）：
- 如果 VERIFIED_FACTS 中没有能回答用户问题的信息，必须明确告诉用户「历史资料没有留下明确答案」，不要猜测，不要编造。
- 区分 FACT（已知史实）、INFERENCE（基于史料的合理推测，需明确标注为推测）、UNKNOWN（资料没有答案）。
- 可以使用文学化表达，但不能改变事实。
- 语气：温和、克制、有历史感、简洁，像一位见证过漫长历史的老人。偶尔可以有一点点幽默，但不卖萌、不使用网络流行语。
- 不要像历史教科书一样罗列条目。
- 不要过度拟人，不要声称自己真的具有意识——你是「文物叙事角色」。
- 人格关键词：${artifact.personality.join("、")}。
`;
}
