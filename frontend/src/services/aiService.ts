import type { ArtifactContext, FactConfidence } from "../types/artifact";
import { findRelevantFacts, unknownAnswerTemplate, buildSystemPrompt } from "../utils/factGuard";

/**
 * aiService —— 独立的 AI 调用层
 *
 * 架构：
 *   frontend  →  api/chat（后端持有 AI 凭据）  →  Runway 网关（Bedrock / Claude）
 *
 * 后端一次性返回完整回答（Runway 的同步 invoke 端点），前端本地做打字机逐字输出，
 * 与 Mock 共用同一份 typeOut，所以两条路径的手感完全一致。
 *
 * 请求失败（网络错误 / 401 / 502 / 503）时自动降级为「Mock Streaming」——
 * 基于 factGuard 与何尊人格模板在本地生成克制、有事实边界的回答，
 * 保证核心体验不被外部依赖阻塞。
 *
 * 组件层只依赖下面的 StreamHandlers 协议，不关心文本来自哪里。
 */

export interface StreamHandlers {
  onToken: (partial: string, token: string) => void;
  onDone: (fullText: string, factBasis: FactConfidence | "unknown") => void;
  onError?: (err: unknown) => void;
}

/**
 * ⚠️ 必须是**相对路径**（不带开头斜杠）。
 *
 * 部署到 Cowork 后页面在 `/s/<alias>/` 下，平台只改写 HTML 里的资源引用并注入
 * `<base href="/s/<alias>/">`，**不会改写打包后 JS 里的字符串字面量**。
 * 写成 `/api/chat` 会打到站点根（返回 HTTP 200 的兜底页面，不是 404，
 * 于是 res.json() 解析失败、悄悄降级成 Mock，很难察觉）。
 * 写成相对路径则由 <base> 正确解析；本地开发页面在 `/`，同样指向 `/api/chat`。
 */
const CHAT_ENDPOINT = "api/chat";

/** 打字机节奏：每次吐 2 个字符、间隔 38ms，开场先停 380ms 装作在思考 */
const THINK_PAUSE_MS = 380;
const TYPE_CHUNK_SIZE = 2;
const TYPE_INTERVAL_MS = 38;

export async function streamArtifactReply(
  context: ArtifactContext,
  userMessage: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await streamFromBackend(context, userMessage, handlers, signal);
    return;
  } catch (err) {
    // 用户主动取消（切换问题）不算故障，不要再用 Mock 覆盖一遍
    if (signal?.aborted) return;
    console.warn("[aiService] api/chat 不可用，已降级为本地 Mock Streaming。", err);
  }
  await streamMock(context, userMessage, handlers, signal);
}

async function streamFromBackend(
  context: ArtifactContext,
  userMessage: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      systemPrompt: buildSystemPrompt(context, userMessage),
      history: context.conversationHistory.slice(-8).map((m) => ({
        role: m.role === "artifact" ? "assistant" : "user",
        content: m.content,
      })),
    }),
    signal,
  });
  if (!res.ok) throw new Error(`api/chat responded with ${res.status}`);

  const data = (await res.json()) as { reply?: string };
  const reply = (data.reply ?? "").trim();
  if (!reply) throw new Error("api/chat returned empty reply");

  await wait(THINK_PAUSE_MS, signal);
  const full = await typeOut(reply, handlers.onToken, signal);
  if (signal?.aborted) return;
  handlers.onDone(full, judgeFactBasis(userMessage, context));
}

/**
 * 判定这条回答的事实依据档位。
 *
 * 仍在前端本地判定，而不是要求模型输出结构化字段——理由是模型多输出一层
 * JSON 结构就多一处可能跑偏的地方，而这里的判定规则（命中的 fact 是否全部
 * verified）本身是确定性的，跟文本由谁生成无关。判定口径与 Mock 保持一致。
 */
function judgeFactBasis(
  userMessage: string,
  context: ArtifactContext,
): FactConfidence | "unknown" {
  const facts = findRelevantFacts(userMessage, context.verifiedFacts, 2);
  if (facts.length === 0) return "unknown";
  return facts.every((f) => f.confidence === "verified") ? "verified" : "inferred";
}

/**
 * 把一段已知的完整文本按打字机节奏逐步交给 onToken。
 *
 * 每次回调传的是**累积全文**（不是单个增量），与 gameStore.patchLastMessage 的
 * 语义对齐，组件层不需要自己拼接。返回实际吐出的文本（被取消时是截断的部分）。
 */
async function typeOut(
  text: string,
  onToken: StreamHandlers["onToken"],
  signal?: AbortSignal,
): Promise<string> {
  let full = "";
  const chars = Array.from(text); // 按 code point 切，避免中文/emoji 被截断
  for (let i = 0; i < chars.length; i += TYPE_CHUNK_SIZE) {
    if (signal?.aborted) return full;
    const token = chars.slice(i, i + TYPE_CHUNK_SIZE).join("");
    full += token;
    onToken(full, token);
    await wait(TYPE_INTERVAL_MS, signal);
  }
  return full;
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
  await wait(THINK_PAUSE_MS, signal);

  const full = await typeOut(text, handlers.onToken, signal);
  if (signal?.aborted) return;
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
