'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { createAnalyticsApi, validateBatch } = require('../src/analytics');
const { createAnalyticsRepository } = require('../src/analyticsDb');
const admin = { id: 'admin', email: 'taojiaxin@xiaohongshu.com', name: '管理员' };
const ordinary = { id: 'reader', email: 'reader@example.com', name: '读者' };
const sample = () => ({ sessionId: randomUUID(), device: 'mobile', source: 'direct',
  events: [{ id: randomUUID(), seq: 1, name: 'heartbeat', step: 'fog', artifact: 'hezun', at: Date.now(), duration: 5000 }] });
function fixture(repository, emails = [admin.email]) {
  const api = createAnalyticsApi({ repository, adminEmails: emails, requireUser(c) {
    const header = c.req.header('decrypted-userinfo');
    if (!header) throw new HTTPException(401);
    return JSON.parse(Buffer.from(header, 'latin1').toString('utf8'));
  } });
  const app = new Hono().route('/', api);
  app.get('/health', (c) => c.text('ok'));
  const request = (user, path = '/api/analytics/events', body = sample(), extra = {}) => app.request(path, {
    method: path === '/api/analytics/events' ? 'POST' : 'GET', headers: { ...(user ? { 'decrypted-userinfo': Buffer.from(JSON.stringify(user), 'utf8').toString('latin1') } : {}), 'content-type': 'application/json', ...extra },
    ...(path === '/api/analytics/events' ? { body: JSON.stringify(body) } : {}),
  });
  return { app, request };
}
test('统计鉴权覆盖概览、访问明细与路径详情，未授权时不访问数据库', async () => {
  let calls = 0;
  const repository = { record: async () => calls++, report: async () => calls++, sessions: async () => calls++, detail: async () => calls++ };
  const f = fixture(repository);
  assert.equal((await f.request(null)).status, 401);
  for (const path of ['/api/admin/analytics', '/api/admin/analytics/sessions', `/api/admin/analytics/sessions/${randomUUID()}`]) {
    assert.equal((await f.request(null, path)).status, 401);
    const response = await f.request(ordinary, path);
    assert.equal(response.status, 403); assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, 0);
  assert.equal((await fixture(repository, []).request(admin, '/api/admin/analytics')).status, 403);
  assert.equal((await f.app.request('/health')).headers.get('cache-control'), null);
});
test('只保存白名单字段，身份来自 SSO，正文与伪造身份不会进入数据库', async () => {
  let received;
  const f = fixture({ async record(user, batch) { received = { user, batch }; } });
  const batch = sample(); batch.owner_key = 'id:admin'; batch.content = '不应采集'; batch.events[0].question = '不应采集';
  assert.equal((await f.request(ordinary, undefined, batch)).status, 200);
  assert.deepEqual(received.user, { owner: 'id:reader', name: '读者' });
  assert.equal(JSON.stringify(received).includes('不应采集'), false);
  assert.equal(received.batch.events[0].duration, 5000);
});
test('拒绝过长批次、非白名单事件、非法时长、重复序号和跨站写入', async () => {
  const f = fixture({ record() { throw new Error('应在入库前拒绝'); } });
  for (const change of [b => { b.events[0].duration = 15001; }, b => { b.events[0].duration = -1; },
    b => { b.events[0].name = '任意输入'; }, b => { b.events[0].step = '任意内容'; },
    b => { b.events[0].name = 'visit'; }, b => { b.events = Array(31).fill(b.events[0]); },
    b => { b.events.push({ ...b.events[0], id: randomUUID() }); }, b => { b.sessionId = 'invalid'; }]) {
    const body = sample(); change(body); assert.equal((await f.request(ordinary, undefined, body)).status, 400);
  }
  assert.equal((await f.request(ordinary, undefined, sample(), { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await f.request(ordinary, undefined, { ...sample(), extra: 'x'.repeat(25000) })).status, 413);
  assert.equal((await f.request(admin, '/api/admin/analytics?days=3')).status, 400);
  assert.equal((await f.request(admin, '/api/admin/analytics/sessions?page=0')).status, 400);
});
test('客户端时间偏差过大时使用服务器时间，数据库不可用不会伪造成功', async () => {
  const batch = sample(); batch.events[0].at = 0;
  assert.equal(validateBatch(batch, 2000000000000).events[0].at, new Date(2000000000000).toISOString());
  const f = fixture({ record() { throw new Error('no database'); }, report() { throw new Error('no database'); } });
  assert.equal((await f.request(ordinary)).status, 503);
  assert.equal((await f.request(admin, '/api/admin/analytics')).status, 503);
});
test('重复上报的时长只累计新插入事件；账号不一致回滚并释放连接', async () => {
  const inserted = new Set(); let sum = 0, released = 0, rollback = 0, currentOwner = 'id:reader';
  const client = { release() { released++; }, async query(sql, values) {
    if (sql.includes('SELECT owner_key')) return { rows: [{ owner_key: currentOwner }] };
    if (sql.includes('INSERT INTO exploration_events')) {
      const rows = [];
      for (const event of JSON.parse(values[1])) if (!inserted.has(event.id)) { inserted.add(event.id); rows.push({ duration: event.duration }); }
      return { rows };
    }
    if (sql.includes('UPDATE exploration_sessions')) sum += values[1];
    if (sql === 'ROLLBACK') rollback++;
    return { rows: [] };
  } };
  const repository = createAnalyticsRepository(async () => ({ query: async () => ({ rows: [] }), connect: async () => client }));
  const batch = validateBatch(sample());
  await repository.record({ owner: 'id:reader', name: '读者' }, batch);
  await repository.record({ owner: 'id:reader', name: '读者' }, batch);
  assert.equal(sum, 5000); assert.equal(released, 2);
  currentOwner = 'id:other';
  await assert.rejects(repository.record({ owner: 'id:reader', name: '读者' }, batch), error => error.status === 409);
  assert.equal(sum, 5000); assert.equal(rollback, 1); assert.equal(released, 3);
});
