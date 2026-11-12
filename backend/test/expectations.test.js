'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { createExpectationsApi, csvCell } = require('../src/expectations');
const { createExpectationRepository } = require('../src/expectationDb');

const owner = { userId: 'owner', username: '测试薯名', email: 'owner@example.com' };
const other = { userId: 'other', username: '另一位', email: 'other@example.com' };
const admin = { userId: 'admin', username: '管理员', email: 'taojiaxin@xiaohongshu.com' };
function fixture() {
  const rows = new Map();
  let dbCalls = 0;
  const repository = {
    async get(user, artifact) { dbCalls++; return rows.get(`${user}:${artifact}`) ?? null; },
    async save(user, display_name, artifact_id, content) {
      dbCalls++; const key = `${user}:${artifact_id}`;
      const previous = rows.get(key);
      const row = { id: previous?.id ?? `id-${key}`, display_name, artifact_id, content,
        source: 'epilogue', created_at: previous?.created_at ?? new Date(), updated_at: new Date() };
      rows.set(key, row); return row;
    },
    async remove(user, artifact) { dbCalls++; rows.delete(`${user}:${artifact}`); },
    async list(_filters, limit, offset) { dbCalls++; return [...rows.values()].slice(offset, offset + limit); },
    async count() { dbCalls++; return rows.size; },
    async summary() { dbCalls++; return { total: rows.size, recent: rows.size, participants: rows.size }; },
  };
  const api = createExpectationsApi({ repository, adminEmails: [admin.email], requireUser(c) {
    const raw = c.req.header('decrypted-userinfo');
    if (!raw) throw new HTTPException(401, { message: 'unauthenticated' });
    return JSON.parse(Buffer.from(raw, 'latin1').toString('utf8'));
  } });
  const app = new Hono().route('/', api);
  app.get('/health', (c) => c.json({ ok: true }));
  app.post('/api/chat', async (c) => c.text(await c.req.text()));
  const request = (user, method = 'GET', url = '/api/expectations?artifactId=hezun', body, extraHeaders = {}) => app.request(url, {
    method, headers: { ...(user ? { 'decrypted-userinfo': Buffer.from(JSON.stringify(user), 'utf8').toString('latin1') } : {}),
      'Content-Type': 'application/json', ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { app, request, rows, repository, calls: () => dbCalls };
}
test('无登录或非管理员不可读取/导出；在访问数据库前拒绝', async () => {
  const f = fixture();
  assert.equal((await f.request(null)).status, 401);
  for (const url of ['/api/admin/expectations', '/api/admin/expectations/export']) {
    const denied = await f.request(owner, 'GET', url);
    assert.equal(denied.status, 403); assert.equal(denied.headers.get('cache-control'), 'no-store');
  }
  assert.equal(f.calls(), 0);
});
test('服务端决定归属；重试更新原记录，其他账号不能读取或删除', async () => {
  const f = fixture();
  const first = await f.request(owner, 'PUT', '/api/expectations', { artifactId: 'hezun', content: '想听长信宫灯', owner_key: 'id:other', display_name: '冒名' });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).expectation.display_name, owner.username);
  const original = [...f.rows.values()][0];
  assert.equal((await (await f.request(other)).json()).expectation, null);
  await f.request(other, 'DELETE'); assert.equal(f.rows.size, 1);
  await f.request(owner, 'PUT', '/api/expectations', { artifactId: 'hezun', content: '想听青铜神树' });
  assert.equal(f.rows.size, 1);
  assert.equal([...f.rows.values()][0].id, original.id);
  assert.equal([...f.rows.values()][0].content, '想听青铜神树');
  const report = await (await f.request(admin, 'GET', '/api/admin/expectations')).json();
  assert.equal(report.total, 1); assert.equal(report.items[0].display_name, owner.username);
  await f.request(owner, 'DELETE'); assert.equal(f.rows.size, 0);
});
test('拒绝空值、过长内容、未知文物、跨站提交以及非法分页', async () => {
  const f = fixture();
  for (const body of [{ artifactId: 'hezun', content: ' ' }, { artifactId: 'hezun', content: '字'.repeat(81) }, { artifactId: 'wrong', content: '内容' }]) {
    assert.equal((await f.request(owner, 'PUT', '/api/expectations', body)).status, 400);
  }
  assert.equal((await f.request(owner, 'PUT', '/api/expectations', { artifactId: 'hezun', content: '内容' }, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await f.request(owner, 'PUT', '/api/expectations', { artifactId: 'hezun', content: '字'.repeat(5000) })).status, 413);
  for (const suffix of ['page=-1', 'page=1.5', 'days=2']) assert.equal((await f.request(admin, 'GET', `/api/admin/expectations?${suffix}`)).status, 400);
  assert.equal(f.calls(), 0);
});
test('空白管理员名单默认拒绝；数据库不可用返回 503 而非假成功', async () => {
  const repository = createExpectationRepository(null);
  const api = createExpectationsApi({ repository, adminEmails: [], requireUser: () => admin });
  assert.equal((await api.request('/api/admin/expectations')).status, 403);
  const result = await api.request('/api/expectations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artifactId: 'hezun', content: '期待' }) });
  assert.equal(result.status, 503); assert.ok((await result.json()).error);
});
test('CSV 编码、引号与公式转义；导出也由管理员校验', async () => {
  const f = fixture();
  await f.request(owner, 'PUT', '/api/expectations', { artifactId: 'hezun', content: '=SUM(1,2)' });
  const response = await f.request(admin, 'GET', '/api/admin/expectations/export');
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/csv/);
  const text = await response.text(); assert.ok(text.includes("'=SUM(1,2)")); assert.ok(text.includes('Cowork 薯名'));
  assert.equal(csvCell('"换行\n'), '"""换行\n"');
});
test('反馈中间件不影响健康检查、静态页面及原有聊天接口', async () => {
  const f = fixture();
  const health = await f.app.request('/health'); assert.equal(health.status, 200); assert.equal(health.headers.get('cache-control'), null);
  const chat = await f.app.request('/api/chat', { method: 'POST', body: '字'.repeat(5000) });
  assert.equal(chat.status, 200);
});
