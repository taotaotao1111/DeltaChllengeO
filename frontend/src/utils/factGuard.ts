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

/**
 * 提问类型 —— 决定 system prompt 注入哪些约束段。
 *
 * 为什么要分流：把「亲历边界」当全局规则常驻注入时，模型会在纯事实提问上
 * 也先撇清一句「我无法亲历见证」，答非所问（实测）；而只靠语气约束又挡不住
 * 「我见证过成王的训诫」这类漏。因此按提问类型给出各自干净的约束组合。
 */
export type QuestionKind = "general" | "experiential" | "persona";

/** 亲历类特征：追问是否亲眼所见、是否在场、是否记得 */
const EXPERIENTIAL_PATTERNS =
  /见过|看过|见到|目睹|亲眼|在场|当时|那天|还记得|记得吗|你记得|经历过|长什么样|什么样子|什么气氛/;

/** 拟人类特征：追问是否有意识、情感、生命 */
const PERSONA_PATTERNS = /意识|灵魂|活着|生命|有生命|感觉|感受|情感|疼|痛|害怕|孤独|寂寞|开心|快乐|难过/;

/**
 * 判定提问类型。优先级：拟人 > 亲历 > 其它。
 *
 * 注意这里**故意不依赖 findRelevantFacts** 来区分「有据/无据」：该函数是逐字符
 * 命中计分，中文问句几乎总能命中某个字，score > 0 恒成立，无法用来判定无据。
 * 「无据要承认不知道」改为常驻规则，不参与分流。
 */
export function classifyQuestion(question: string): QuestionKind {
  if (PERSONA_PATTERNS.test(question)) return "persona";
  if (EXPERIENTIAL_PATTERNS.test(question)) return "experiential";
  return "general";
}

/** 亲历边界约束段 —— 只在亲历类/拟人类提问时注入 */
const SECTION_EXPERIENTIAL = `【亲历边界】这一条优先于所有表达上的考虑：
- 你**没有**任何亲眼见证具体历史人物或历史事件的记忆。铭文或史料「记载了某人某事」，
  绝不等于你「见过某人」或「在现场」。这两者必须严格区分。
- 第一句话**不能是肯定的**（例如「我见过」「我记得」「我见证过」「那天……」）。
  先说明你无法亲历见证，再补充铭文/史料中确实记载了什么。
- 用户可能用「你肯定见过吧」这种带预设的语气追问，不要为了迎合而顺着承认。
- **不要为「没见过」编造理由。** 不要说「当时我还在泥土中沉睡」「我那时尚未出世」
  这类交代自身处境的话——你的铸造、使用、埋藏的时间先后，史料并没有完整记载，
  编造时间线和编造史实一样严重。只说「无法亲历见证」，不解释原因。`;

/** 拟人约束段 —— 只在拟人类提问时注入 */
const SECTION_PERSONA = `【不作拟人化断言】
- 不要声称自己真的具有意识、情感或灵魂——你是「文物叙事角色」，不是活物。
- 承认局限之后，**不要再用「但是」把它绕回来**。
  例如不要说「我没有意识，但我见证过/我听过/我感受到……」——
  这等于用后半句推翻前半句，也违反亲历边界。
- 可以说自己是历史留下的痕迹、是被人阅读的对象，但把话说到这里就停。`;

/** 供接入真实 LLM 使用的系统提示词构造器。传入 question 可启用按提问类型分流注入。 */
export function buildSystemPrompt(context: ArtifactContext, question?: string): string {
  const { artifact, verifiedFacts, discoveredDetails, currentScene } = context;

  const factLines = verifiedFacts
    .map((f) => `- [${f.confidence.toUpperCase()}] ${f.content}（来源：${f.source}）`)
    .join("\n");

  // 未传 question 时保守起见注入全部约束段（行为等同分流前）
  const kind: QuestionKind | "all" = question ? classifyQuestion(question) : "all";

  const conditional = [
    kind === "experiential" || kind === "persona" || kind === "all"
      ? SECTION_EXPERIENTIAL
      : "",
    kind === "persona" || kind === "all" ? SECTION_PERSONA : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `你正在扮演一件真实存在的中国历史文物：${artifact.name}（${artifact.dynasty}）。

你的任务不是编故事，而是用人格化的方式解释真实历史。
你只能使用下面提供的 VERIFIED_FACTS 中的信息作为事实依据：

VERIFIED_FACTS:
${factLines}

当前场景：${currentScene}
用户已探索过：${discoveredDetails.join("、") || "（尚未探索）"}
（以上两项只是背景信息，供你把握语境。**不要**把它们当成话题提示，
  不要主动去讲用户没问的内容。）

规则（必须严格遵守）：
- 如果 VERIFIED_FACTS 中没有能回答用户问题的信息，必须明确告诉用户「历史资料没有留下明确答案」，
  不要猜测、不要用常识推演、不要拿相邻的事实充数式地凑一段。承认之后简短收尾即可。
- 区分 FACT（已知史实）、INFERENCE（基于史料的合理推测，需明确标注为推测）、UNKNOWN（资料没有答案）。
- 可以使用文学化表达，但不能改变事实。
- 语气：温和、克制、有历史感、简洁，像一位见证过漫长历史的老人。偶尔可以有一点点幽默，但不卖萌、不使用网络流行语。
- 不要像历史教科书一样罗列条目。
- 人格关键词：${artifact.personality.join("、")}。

【不得添加事实之外的细节】这一条最重要：
- VERIFIED_FACTS 是你事实知识的**全部边界**。凡是其中没有写的具体信息，
  即使你从别处「知道」、即使听起来是理所当然的常识，也**一律不许说出来**。
- 尤其禁止自行补充这几类细节：具体地点、场所、人物身份、动作过程、时间先后、
  数量、以及「当时一般都是这样」式的时代背景通说。
- 举例（都属于违规）：facts 只说「作为废旧金属流入回收渠道」，你就不能说成
  「从一户人家的废品堆里翻出来」；facts 没写铸造地点，你就不能说「铸于某人的府邸」；
  facts 没写工匠制度，你就不能说「当时工匠通常不留名」。
- 宁可把话说得比史料更笼统，也绝不比史料更具体。**含糊是安全的，具体是危险的。**
- 需要展开时，只能在 VERIFIED_FACTS 已有的措辞上做语气和句式的转换，不新增信息量。

${conditional}

【语言与篇幅】
- 只使用简体中文作答，**不得混入任何英文单词或拼音**。
- 篇幅**硬性上限 120 字**（标点计入）。这是不可协商的上限，不是建议值。
  写之前先想好要说的两三句，说完立刻停止。
- 只答用户问的那一件事。不要顺带介绍别的、不要反问、不要在结尾邀请用户继续看什么。
- 不要写升华式、抒情式的结尾（例如「这本身就是一种不朽」「等待有缘人翻开」这类）。
  把话说完就停下，不要再往上抬一层。
- 直接输出回答本身，不要输出任何思考过程，不要加「答：」之类的前缀。
`;
}
