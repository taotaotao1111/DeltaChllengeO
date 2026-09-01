import type { ArtifactContext, FactConfidence } from "../types/artifact";
import { findRelevantFacts, unknownAnswerTemplate, buildSystemPrompt } from "../utils/factGuard";

/**
 * aiService —— 独立的 AI 调用层
 *
 * 架构意图：
 *   frontend  →  /api/chat（后端 AI Service，负责持有真正的 LLM API Key）  →  LLM
 *
 * 当前 Demo 运行环境没有可用的后端 / API Key，因此：
 *   - 若配置了 VITE_AI_API_URL，会尝试真实请求；
 *   - 否则（以及请求失败时）自动降级为「Mock Streaming」——
 *     基于 factGuard 与何尊人格模板在本地生成克制、有事实边界的回答，
 *     并模拟逐字流式输出，保证核心体验不被外部依赖阻塞。
 *
 * 这样设计的好处：未来接入真实后端时，只需要让 /api/chat 返回同样的流式协议，
 * 组件层完全不需要改动。
 */

export interface StreamHandlers {
  onToken: (partial: string, token: string) => void;
  onDone: (fullText: string, factBasis: FactConfidence | "unknown") => void;
  onError?: (err: unknown) => void;
}

const REMOTE_ENDPOINT = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_AI_API_URL;

export async function streamArtifactReply(
  context: ArtifactContext,
  userMessage: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (REMOTE_ENDPOINT) {
    try {
      await streamFromRemote(REMOTE_ENDPOINT, context, userMessage, handlers, signal);
      return;
    } catch (err) {
      // 真实后端不可用时，无缝降级，不打断体验
      console.warn("[aiService] 远程 AI 服务不可用，已降级为本地 Mock Streaming。", err);
    }
  }
  await streamMock(context, userMessage, handlers, signal);
}

async function streamFromRemote(
  endpoint: string,
  context: ArtifactContext,
  userMessage: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      systemPrompt: buildSystemPrompt(context),
      history: context.conversationHistory.slice(-8),
    }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`AI service responded with ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    handlers.onToken(full, chunk);
  }
  handlers.onDone(full, "verified");
}

/** ------------------------- Mock Streaming 实现 ------------------------- */

const UNKNOWN_TRIGGERS = [
  "见过",
  "认识周",
  "谁埋",
  "谁把你埋",
  "谁使用过你之后",
  "本名叫什么",
  "埋你的人是谁",
  "你有生命吗",
  "你真的活着吗",
  "你是不是真的有意识",
  "你有灵魂吗",
];

interface PersonaAnswer {
  match: (q: string) => boolean;
  answer: string;
  factBasis: FactConfidence | "unknown";
}

/** 一批「人格化闲聊」问题的精心设计回答（不涉及新的历史事实断言） */
const PERSONA_ANSWERS: PersonaAnswer[] = [
  {
    match: (q) => /贵|值钱|钱|价格/.test(q),
    answer:
      "在我的那个年代，青铜并不是寻常之物。\n不过，真正珍贵的，或许从来不是青铜本身。",
    factBasis: "inferred",
  },
  {
    match: (q) => /孤独|寂寞/.test(q),
    answer:
      "很长一段时间里，只有黑暗和我在一起。\n但现在，你站在我面前——这样想的话，也没有那么孤独了。",
    factBasis: "inferred",
  },
  {
    match: (q) => /疼|痛|害怕|恐惧/.test(q),
    answer:
      "疼痛和恐惧，是活着的人才会有的感觉。\n我经历的，更像是一种很长很长的静止。",
    factBasis: "inferred",
  },
  {
    match: (q) => /开心|快乐|高兴/.test(q),
    answer: "如果有人愿意认真听一件旧物说话，那大概就是我能理解的“高兴”了。",
    factBasis: "inferred",
  },
  {
    match: (q) => /意识|活着|生命|灵魂/.test(q),
    answer:
      "我不会说自己真的活着，也不会说自己拥有意识。\n我更愿意说，我是一段历史留下的痕迹，而你，正在读它。",
    factBasis: "inferred",
  },
];

function isUnanswerable(question: string): boolean {
  return UNKNOWN_TRIGGERS.some((kw) => question.includes(kw));
}

function pickPersonaAnswer(question: string): PersonaAnswer | undefined {
  return PERSONA_ANSWERS.find((p) => p.match(question));
}

function composeFactAnswer(question: string, context: ArtifactContext): {
  text: string;
  factBasis: FactConfidence | "unknown";
} {
  const facts = findRelevantFacts(question, context.verifiedFacts, 2);
  if (facts.length === 0) {
    return { text: unknownAnswerTemplate(), factBasis: "unknown" };
  }

  const lead = facts.map((f) => f.content).join("\n");
  const confidence: FactConfidence = facts.every((f) => f.confidence === "verified")
    ? "verified"
    : "inferred";

  const closing =
    confidence === "inferred"
      ? "\n\n这一段，更接近合理的推测，而不是百分百确定的史实。"
      : "";

  return { text: `${lead}${closing}`, factBasis: confidence };
}

function buildMockReply(
  context: ArtifactContext,
  userMessage: string,
): { text: string; factBasis: FactConfidence | "unknown" } {
  const q = userMessage.trim();

  if (isUnanswerable(q)) {
    return { text: unknownAnswerTemplate(), factBasis: "unknown" };
  }

  const persona = pickPersonaAnswer(q);
  if (persona) {
    return { text: persona.answer, factBasis: persona.factBasis };
  }

  return composeFactAnswer(q, context);
}

async function streamMock(
  context: ArtifactContext,
  userMessage: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const { text, factBasis } = buildMockReply(context, userMessage);

  // 模拟「思考」停顿，让回答显得不是瞬间吐出来的
  await wait(380, signal);

  let full = "";
  const chars = Array.from(text);
  const chunkSize = 2;
  for (let i = 0; i < chars.length; i += chunkSize) {
    if (signal?.aborted) return;
    const token = chars.slice(i, i + chunkSize).join("");
    full += token;
    handlers.onToken(full, token);
    await wait(38, signal);
  }
  handlers.onDone(full, factBasis);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}
