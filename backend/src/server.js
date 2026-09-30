/**
 * 《物语千年》Cowork 子应用后端。
 *
 * 职责：
 *  1. 托管 frontend/dist 静态产物 + SPA fallback
 *  2. 解析平台注入的 SSO 用户身份
 *  3. 顶层 /health 供 Guard 探活
 *  4. POST /api/chat —— 把前端拼好的 system prompt 转发给 Runway 网关（Bedrock / Claude）
 *
 * Guard 规范：必须监听 0.0.0.0:${APP_PORT:-3000}
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { serve } = require('@hono/node-server');
const { serveStatic } = require('@hono/node-server/serve-static');

const PORT = parseInt(process.env.APP_PORT || '3000', 10);
const HOST = '0.0.0.0';

// start.sh 会 cd 到 backend/，__dirname = backend/src → 上溯两级回到 zip 根
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const INDEX_HTML = path.join(FRONTEND_DIST, 'index.html');

// ---------------------------------------------------------------------------
// properties 加载（平台在 Pod 启动时把 ai.properties 注入到 install.sh 同级目录）
// ---------------------------------------------------------------------------

/**
 * 解析 .properties。start.sh 会 cd 到 backend/，__dirname = backend/src，
 * 所以上溯两级才是 zip 根（install.sh / ai.properties 所在处）。
 *
 * 本地开发看不到这个文件是正常的——它由平台运行时注入，不入库、不进 zip。
 */
function loadProps(name) {
  const filePath = path.join(__dirname, '../../', name);
  const out = {};
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const eq = t.indexOf('=');
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

const aiProps = loadProps('ai.properties');
if (!aiProps) console.warn('[ai] ai.properties 未找到，/api/chat 将返回 503');

// ---------------------------------------------------------------------------
// Runway 网关调用
// ---------------------------------------------------------------------------

/** 回答限制在 120 字以内（system prompt 里也写了），512 token 足够且能压住啰嗦 */
const MAX_TOKENS = 512;

/**
 * 调 Runway Bedrock 文本接口，返回模型回复的纯文本。
 *
 * 调用约定（违反任一条会被平台校验器拦下）：
 *   - header 用 `token:`，**不是** Authorization: Bearer
 *   - body 必须带 anthropic_version，固定 'bedrock-2023-05-31'
 *   - 不传 model（模型由 api_key 在网关侧绑定）、不传 temperature / top_p
 *   - 200 OK 也可能是业务错，必须显式检查 data.Code / data.Error
 *
 * system prompt 走**顶级 system 字段**，不塞进 messages —— 这是 Anthropic 的协议要求，
 * 塞进 messages 会让「不作亲历断言」这类硬约束的权重下降。
 */
async function llmChat(messages, systemPrompt) {
  if (!aiProps?.['ai.base_url'] || !aiProps?.['ai.api_key']) {
    throw new HTTPException(503, { message: 'ai.properties 未配置' });
  }

  // model 显式传：2026-09-30 起网关不再把空 model 回落到 key 绑定的模型
  // （403 key_model_not_bound：请求模型 '' 未绑定。绑定清单里是 claude-opus-4-8）。
  // properties 里没这个 key，从网关错误信息里拿到的确切名字写死在这。
  const MODEL = aiProps['ai.model'] || 'claude-opus-4-8';

  const resp = await fetch(`${aiProps['ai.base_url']}/bedrock_runtime/model/invoke`, {
    method: 'POST',
    headers: {
      token: aiProps['ai.api_key'],
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await resp.json();
  if (data.Code || data.Error) {
    throw new HTTPException(502, { message: `AI call failed: ${JSON.stringify(data)}` });
  }

  // 记录网关实际绑定的模型，方便确认到底在用哪个 Claude
  if (data.model) console.log(`[ai] model=${data.model}`);

  const text = (data.content ?? [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) {
    throw new HTTPException(502, { message: `AI returned no text: ${JSON.stringify(data)}` });
  }
  return { text, model: data.model ?? null };
}

// ---------------------------------------------------------------------------
// SSO
// ---------------------------------------------------------------------------

/**
 * 从 Decrypted-Userinfo 请求头解析 SSO 用户。
 *
 * 平台把 UTF-8 字节当 latin-1 塞进 header，所以必须先按 latin1 收字节、
 * 再按 utf8 解码，否则中文用户名会乱码。没有 base64 这一步。
 */
function parseSsoUser(headerValue) {
  if (!headerValue) return null;
  try {
    return JSON.parse(Buffer.from(headerValue, 'latin1').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * 业务路由取当前用户；拿不到直接 401。
 *
 * ⚠️ 只在具体业务路由的 handler 内部调用，**绝不要做成全局中间件**——
 * 那会把 index.html / JS / 图片 / hezun.glb 一起拦成 401，页面直接白屏。
 * 静态资源必须保持匿名可读，登录跳转由 Cowork Guard 网关负责。
 */
function requireUser(c) {
  const user = parseSsoUser(c.req.header('decrypted-userinfo'));
  if (!user) throw new HTTPException(401, { message: 'unauthenticated' });
  return user;
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

const app = new Hono();

// 探活：必须挂顶层 /health，不带任何前缀
app.get('/health', (c) => c.json({ ok: true }));

// 当前登录者。第一期前端还没有调用它，保留作为 SSO 接入的验证点，
// 第二期 /api/chat 复用同一个 requireUser。
app.get('/api/whoami', (c) => {
  const u = requireUser(c);
  return c.json({
    userId: u.userId ?? u.id,
    username: u.username ?? u.name ?? u.displayName,
    email: u.email ?? u.workEmail,
  });
});

/**
 * 把前端传来的对话历史整理成 Anthropic 能接受的形状。
 *
 * 协议要求 messages 必须从 user 开始、且 user/assistant 交替。前端传的是
 * conversationHistory.slice(-8)，截断边界可能正好落在文物回复上（历史以
 * assistant 开头），或出现连续同角色，都会让网关报协议错。这里统一兜住：
 *   1. 丢掉空内容
 *   2. 丢掉开头的 assistant
 *   3. 连续同角色只保留最后一条（后一条通常是修正/续写）
 *
 * 归一化后最后一条若是 user，也无妨——调用方会再追加本轮的 user 消息，
 * 届时同角色合并规则由步骤 3 在此处已保证不会出现连续三条同角色。
 */
function normalizeHistory(raw) {
  const items = (Array.isArray(raw) ? raw : [])
    .filter((h) => typeof h?.content === 'string' && h.content.trim())
    .map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content.trim(),
    }));

  while (items.length && items[0].role === 'assistant') items.shift();

  const out = [];
  for (const item of items) {
    if (out.length && out[out.length - 1].role === item.role) {
      out[out.length - 1] = item;
    } else {
      out.push(item);
    }
  }
  // 末尾若是 user，追加本轮 user 会造成连续两条 user —— 去掉它，本轮内容更完整
  if (out.length && out[out.length - 1].role === 'user') out.pop();
  return out;
}

/**
 * 何尊对话。
 *
 * Request:  { message: string, systemPrompt: string, history?: [{role, content}] }
 * Response: { reply: string, model: string|null }
 *
 * system prompt 由前端的 factGuard.buildSystemPrompt 拼好后传上来——事实数据和
 * 护栏规则都在前端的 artifact 档案里，后端只做转发，不复制一份事实定义。
 */
app.post('/api/chat', async (c) => {
  requireUser(c);

  const body = await c.req.json().catch(() => ({}));
  const message = (body?.message ?? '').trim();
  const systemPrompt = (body?.systemPrompt ?? '').trim();
  if (!message) throw new HTTPException(400, { message: 'message is required' });
  if (!systemPrompt) throw new HTTPException(400, { message: 'systemPrompt is required' });

  const history = normalizeHistory(body?.history);
  const messages = [...history, { role: 'user', content: message }];
  const { text, model } = await llmChat(messages, systemPrompt);
  return c.json({ reply: text, model });
});

// ---------------------------------------------------------------------------
// 行为埋点（内存态）
// ---------------------------------------------------------------------------

/**
 * 只存枚举维度与聚合计数：不存问题文本、不存 userId（userId 仅用于鉴权）。
 * 内存存储，Pod 重启 / 蓝绿切换即清零——统计窗口如实暴露给前端（since 字段）。
 */
const TRACK_EVENTS = {
  visit_source: ['source'], // 进站来源（记忆卡二维码 ?from=card 等）
  stage_reach: ['stage'],
  artifact_select: ['artifactId', 'revisit'],
  chapter_view: ['artifactId', 'chapterIndex'],
  chapter_complete: ['artifactId', 'chapterIndex'],
  hotspot_discover: ['artifactId', 'hotspotId', 'hotspotType'],
  chat_reply: ['artifactId', 'questionKind', 'factBasis'],
  memory_card_open: ['artifactId', 'discoveredCount'],
  glyph_trace_done: ['artifactId'],
  flip_card_view: ['artifactId', 'cardId', 'face'],
  inscription_section_view: ['artifactId', 'sectionIndex'],
  appraise_answer: ['artifactId', 'questionId', 'correct'],
  session_resume: ['stage'],
};
const TRACK_ENUMS = {
  'visit_source|source': ['card'],
  'chat_reply|questionKind': ['general', 'experiential', 'persona'],
  'chat_reply|factBasis': ['verified', 'inferred', 'unknown'],
  'appraise_answer|correct': ['0', '1'],
};
const TRACK_START = Date.now();
const trackTotals = new Map(); // name -> count
const trackDims = new Map();   // `${name}|${field}=${value}` -> count

function trackBump(name, props) {
  trackTotals.set(name, (trackTotals.get(name) ?? 0) + 1);
  for (const field of TRACK_EVENTS[name]) {
    const v = props?.[field];
    if (v === undefined || v === null) continue;
    const enumOk = TRACK_ENUMS[`${name}|${field}`];
    if (enumOk && !enumOk.includes(String(v))) continue; // 枚举外的值丢弃
    const key = `${name}|${field}=${String(v).slice(0, 40)}`;
    trackDims.set(key, (trackDims.get(key) ?? 0) + 1);
  }
}

app.post('/api/track', async (c) => {
  requireUser(c); // 铁律：只在 handler 内，绝不做成全局中间件
  const body = await c.req.json().catch(() => ({}));
  const events = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];
  let accepted = 0;
  for (const ev of events) {
    if (!ev || typeof ev.name !== 'string') continue;
    if (!Object.prototype.hasOwnProperty.call(TRACK_EVENTS, ev.name)) continue; // 白名单外静默丢弃
    trackBump(ev.name, ev.props);
    accepted++;
  }
  return c.json({ ok: true, accepted });
});

/** 某事件某维度的分桶 { value: count } */
function trackDim(name, field) {
  const out = {};
  const prefix = `${name}|${field}=`;
  for (const [k, v] of trackDims) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  }
  return out;
}

app.get('/api/stats', (c) => {
  // 不加 requireUser：Sources 是公开页，且数据已脱敏为聚合计数
  const chatTotal = trackTotals.get('chat_reply') ?? 0;
  const selects = trackTotals.get('artifact_select') ?? 0;
  const basis = trackDim('chat_reply', 'factBasis');
  const kinds = trackDim('chat_reply', 'questionKind');
  const visitSources = trackDim('visit_source', 'source');
  const chapterCompletes = trackDim('chapter_complete', 'chapterIndex');
  const lastChapterIdx = Object.keys(chapterCompletes)
    .map(Number)
    .reduce((a, b) => Math.max(a, b), -1);

  return c.json({
    since: TRACK_START,
    totals: Object.fromEntries(trackTotals),
    ratios: {
      chatBasis: basis,
      chatUnknownRate: chatTotal ? (basis.unknown ?? 0) / chatTotal : null,
      questionMix: kinds,
      visitSources,
      completionRate: selects > 0 && lastChapterIdx >= 0 ? chapterCompletes[String(lastChapterIdx)] / selects : null,
      memoryCardRate: selects ? (trackTotals.get('memory_card_open') ?? 0) / selects : null,
      avgHotspots: selects ? (trackTotals.get('hotspot_discover') ?? 0) / selects : null,
    },
  });
});

// ---------------------------------------------------------------------------
// 静态前端托管 + SPA fallback
// ---------------------------------------------------------------------------

if (fs.existsSync(FRONTEND_DIST)) {
  // serveStatic 的 root 相对 cwd（start.sh 已 cd 到 backend/）
  app.use('/*', serveStatic({ root: '../frontend/dist' }));

  // serveStatic 只命中真实存在的文件；/sources 这类前端路由要回 index.html
  app.notFound((c) => {
    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: 'not found' }, 404);
    }
    if (fs.existsSync(INDEX_HTML)) {
      return c.html(fs.readFileSync(INDEX_HTML, 'utf8'));
    }
    return c.json({ error: 'frontend/dist 未 build' }, 503);
  });
} else {
  console.warn('[server] frontend/dist 不存在，静态托管未启用');
}

serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
  console.log(`[server] listening on http://${info.address}:${info.port}`);
});
