'use strict';

const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { bodyLimit } = require('hono/body-limit');

const ARTIFACTS = new Set(['hezun', 'changxin']);
function artifactId(value) {
  if (!ARTIFACTS.has(value)) throw new HTTPException(400, { message: '请选择有效的文物。' });
  return value;
}
function userIdentity(user) {
  const id = user.userId ?? user.id;
  const email = user.email ?? user.workEmail;
  if (!id && !email) throw new HTTPException(401, { message: '请登录后再提交。' });
  return {
    owner: id ? `id:${String(id)}` : `email:${String(email).trim().toLowerCase()}`,
    name: String((typeof user.redName === 'string' && user.redName.trim()) || user.username || user.name || user.displayName || '').slice(0, 120),
  };
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function createExpectationsApi({ requireUser, repository, adminEmails, resolveIdentity }) {
  const api = new Hono();
  const admins = new Set(adminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const identity = (c) => resolveIdentity ? resolveIdentity(c) : userIdentity(requireUser(c));
  function admin(c) {
    const user = requireUser(c);
    const email = String(user.email ?? user.workEmail ?? '').trim().toLowerCase();
    if (!email || !admins.has(email)) throw new HTTPException(403, { message: '仅管理员可访问。' });
    return user;
  }
  async function database(task) {
    try { return await task(); }
    catch (error) {
      if (error instanceof HTTPException) throw error;
      console.warn('[expectations] database operation failed');
      throw new HTTPException(503, { message: '期待服务暂时不可用，请稍后重试。' });
    }
  }
  const protect = async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(c.req.method) &&
        (c.req.header('sec-fetch-site') === 'cross-site' || !c.req.header('content-type')?.startsWith('application/json'))) {
      throw new HTTPException(403, { message: '不支持此提交方式。' });
    }
    await next();
  };
  for (const route of ['/api/expectations', '/api/admin/expectations', '/api/admin/expectations/*']) api.use(route, protect);
  api.use('/api/expectations', bodyLimit({ maxSize: 4096, onError: (c) => c.json({ error: '提交内容过长。' }, 413) }));
  api.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    return c.json({ error: '请求失败，请稍后重试。' }, 500);
  });
  api.get('/api/expectations', async (c) => {
    const user = await identity(c);
    const artifact = artifactId(c.req.query('artifactId'));
    return c.json({ expectation: await database(() => repository.get(user.owner, artifact)) });
  });
  api.put('/api/expectations', async (c) => {
    const user = await identity(c);
    const body = await c.req.json().catch(() => null);
    const artifact = artifactId(body?.artifactId);
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content || [...content].length > 80) throw new HTTPException(400, { message: '请填写 1～80 字的期待。' });
    const expectation = await database(() => repository.save(user.owner, user.name, artifact, content));
    return c.json({ expectation });
  });
  api.delete('/api/expectations', async (c) => {
    const user = await identity(c);
    const artifact = artifactId(c.req.query('artifactId'));
    await database(() => repository.remove(user.owner, artifact));
    return c.json({ ok: true });
  });
  api.get('/api/admin/expectations', async (c) => {
    admin(c);
    if (resolveIdentity) await identity(c);
    const q = (c.req.query('q') ?? '').trim().slice(0, 80);
    const days = Number(c.req.query('days') ?? 0);
    const page = Number(c.req.query('page') ?? 1);
    if (![0, 7, 30].includes(days) || !Number.isInteger(page) || page < 1 || page > 100000) {
      throw new HTTPException(400, { message: '筛选条件无效。' });
    }
    const result = await database(async () => {
      const [items, total, summary] = await Promise.all([
        repository.list({ q, days }, 50, (page - 1) * 50), repository.count({ q, days }), repository.summary(),
      ]);
      return { items, total, summary, page, pageSize: 50 };
    });
    return c.json(result);
  });
  api.get('/api/admin/expectations/export', async (c) => {
    admin(c);
    if (resolveIdentity) await identity(c);
    const days = Number(c.req.query('days') ?? 0);
    if (![0, 7, 30].includes(days)) throw new HTTPException(400, { message: '筛选条件无效。' });
    const filters = { q: (c.req.query('q') ?? '').trim().slice(0, 80), days };
    const rows = await database(async () => {
      if (await repository.count(filters) > 10000) throw new HTTPException(400, { message: '一次最多导出一万条，请缩小筛选范围。' });
      return repository.list(filters, 10000, 0);
    });
    const content = '\uFEFF' + [
      ['Cowork 薯名', '用户期待', '当前文物', '来源', '首次提交时间（UTC）', '最近修改时间（UTC）'],
      ...rows.map((row) => [row.display_name, row.content, row.artifact_id, row.source,
        new Date(row.created_at).toISOString(), new Date(row.updated_at).toISOString()]),
    ].map((row) => row.map(csvCell).join(',')).join('\r\n');
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', 'attachment; filename="user-expectations.csv"');
    return c.body(content);
  });
  return api;
}
module.exports = { createExpectationsApi, csvCell, userIdentity };
