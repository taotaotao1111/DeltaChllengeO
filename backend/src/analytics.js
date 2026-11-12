'use strict';
const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { bodyLimit } = require('hono/body-limit');
const { userIdentity } = require('./expectations');

const STEPS = new Set(['opening', 'gallery', 'fog', 'observe', 'qa', 'derust', 'inscription', 'reunion', 'timeline', 'memory', 'ai', 'epilogue', 'sources']);
const EVENTS = new Set(['visit', 'step_enter', 'heartbeat', 'pause', 'fog_complete', 'fog_skip', 'chapter_complete', 'hotspot_discover', 'flip_card_view', 'inscription_section_view', 'appraise_answer', 'story_complete', 'memory_card_open', 'expectation_submit', 'encounter_finish', 'glyph_trace_done', 'chat_reply', 'session_resume', 'continue_mainline', 'deep_dive_open', 'menu_navigation']);
const NODES = new Set(['overview', 'why', 'who', 'carve', 'mind', 'hotspot-pattern', 'hotspot-banana-leaf', 'hotspot-flange', 'hotspot-foot', 'hotspot-form', 'hotspot-inscription', 'hotspot-timeline', 'lead-in', 'derust', 'compare', 'focus', 'guess', 'closing', 'sec-opening', 'sec-admonition', 'sec-ancestors', 'sec-climax', 'sec-exhort', 'sec-reward', 'card-1963', 'card-30yuan', 'card-rescue', 'card-dormant', 'card-1975', 'card-revalue', 'casting', 'quiet', 'rediscovery', 'today']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalid() { throw new HTTPException(400, { message: '统计参数无效。' }); }
/** 严格选取字段；不存提问、留言、期待正文或任意客户端标签。 */
function validateBatch(body, now = Date.now()) {
  if (!UUID.test(body?.sessionId ?? '') || !['mobile', 'desktop'].includes(body?.device) || !['direct', 'card'].includes(body?.source) ||
      !Array.isArray(body?.events) || !body.events.length || body.events.length > 30) invalid();
  const events = body.events.map((event) => {
    if (!UUID.test(event?.id ?? '') || !Number.isSafeInteger(event.seq) || event.seq < 1 || event.seq > 1000000 ||
        !EVENTS.has(event.name) || !STEPS.has(event.step) || !['hezun', 'changxin'].includes(event.artifact) ||
        !NODES.has(event.node ?? 'overview') || !Number.isFinite(event.at) || !Number.isInteger(event.duration) || event.duration < 0 || event.duration > 15000) invalid();
    if (event.name !== 'heartbeat' && event.duration !== 0) invalid();
    return { id: event.id, seq: event.seq, name: event.name, step: event.step, node: event.node ?? 'overview', artifact: event.artifact,
      at: new Date(Math.abs(event.at - now) <= 300000 ? event.at : now).toISOString(), duration: event.duration };
  });
  if (new Set(events.map((e) => e.id)).size !== events.length || new Set(events.map((e) => e.seq)).size !== events.length) invalid();
  return { sessionId: body.sessionId, device: body.device, source: body.source, events };
}
function createAnalyticsApi({ requireUser, repository, adminEmails, resolveIdentity }) {
  const api = new Hono();
  const admins = new Set(adminEmails.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const identity = (c) => resolveIdentity ? resolveIdentity(c) : userIdentity(requireUser(c));
  const guard = async (c) => {
    const user = requireUser(c);
    if (!admins.has(String(user.email ?? user.workEmail ?? '').trim().toLowerCase())) throw new HTTPException(403, { message: '仅管理员可访问。' });
    if (resolveIdentity) await identity(c);
  };
  for (const path of ['/api/analytics/events', '/api/admin/analytics', '/api/admin/analytics/*']) api.use(path, async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (c.req.method === 'POST' && (c.req.header('sec-fetch-site') === 'cross-site' || !c.req.header('content-type')?.startsWith('application/json'))) {
      throw new HTTPException(403, { message: '不支持此提交方式。' });
    }
    await next();
  });
  api.use('/api/analytics/events', bodyLimit({ maxSize: 24576, onError: (c) => c.json({ error: '统计批次过大。' }, 413) }));
  api.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.warn('[analytics] database operation failed');
    return c.json({ error: '统计服务暂不可用，请稍后重试。' }, 503);
  });
  api.post('/api/analytics/events', async (c) => {
    const user = await identity(c);
    const batch = validateBatch(await c.req.json().catch(() => null));
    await repository.record(user, batch);
    return c.json({ ok: true });
  });
  const filters = (c) => {
    const days = Number(c.req.query('days') ?? 7);
    const page = Number(c.req.query('page') ?? 1);
    if (![0, 1, 7, 30].includes(days) || !Number.isInteger(page) || page < 1 || page > 100000) invalid();
    return { days, page };
  };
  api.get('/api/admin/analytics', async (c) => { await guard(c); return c.json(await repository.report(filters(c))); });
  api.get('/api/admin/analytics/sessions', async (c) => { await guard(c); return c.json(await repository.sessions(filters(c))); });
  api.get('/api/admin/analytics/sessions/:id', async (c) => {
    await guard(c);
    const id = c.req.param('id'); if (!UUID.test(id)) invalid();
    const result = await repository.detail(id);
    if (!result) throw new HTTPException(404, { message: '此访问记录不存在。' });
    return c.json(result);
  });
  return api;
}
module.exports = { createAnalyticsApi, validateBatch };
