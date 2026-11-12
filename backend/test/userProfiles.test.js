'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createUserProfiles, lookupRedName } = require('../src/userProfiles');
const { createExpectationsApi } = require('../src/expectations');
const { createAnalyticsApi } = require('../src/analytics');
const { HTTPException } = require('hono/http-exception');

test('非管理员不能借由后台查询触发薯名解析或读取记录', async () => {
  let resolved = 0;
  for (const createApi of [createExpectationsApi, createAnalyticsApi]) {
    const api = createApi({ adminEmails: ['admin@example.com'], repository: {},
      requireUser(c) { if (!c.req.header('authorization')) throw new HTTPException(401); return { userId: 'reader', email: 'reader@example.com' }; },
      async resolveIdentity() { resolved++; throw new Error('不应执行'); } });
    const paths = createApi === createExpectationsApi ? ['/api/admin/expectations', '/api/admin/expectations/export'] : ['/api/admin/analytics', '/api/admin/analytics/sessions', '/api/admin/analytics/sessions/00000000-0000-4000-8000-000000000001'];
    for (const path of paths) {
      assert.equal((await api.request(path)).status, 401);
      assert.equal((await api.request(path, { headers: { authorization: 'test' } })).status, 403);
    }
  }
  assert.equal(resolved, 0);
});
const { userIdentity } = require('../src/expectations');
function fixture(lookup) {
  const profiles = new Map(), mutations = [];
  let now = 100;
  const pool = { async query(sql, values) {
    if (sql.startsWith('SELECT')) return { rows: profiles.has(values[0]) ? [{ red_name: profiles.get(values[0]) }] : [] };
    mutations.push(sql); profiles.set(values[0], values[1]); return { rows: [] };
  } };
  return { profiles, mutations, advance: () => { now += 180001; }, service: createUserProfiles({ database: async () => pool, lookup, now: () => now }) };
}
test('优先官方薯名，昵称不参与账号归属；同薯名也不会合并不同账号', async () => {
  const f = fixture(async () => '莲花');
  const first = await f.service.resolve({ userId: 'id-1', username: '陶嘉欣', email: 'one@example.com' }, 'cookie');
  const second = await f.service.resolve({ userId: 'id-2', username: '其他人', email: 'two@example.com' }, 'cookie');
  assert.deepEqual(first, { owner: 'id:id-1', name: '莲花' });
  assert.deepEqual(second, { owner: 'id:id-2', name: '莲花' });
  assert.equal(f.profiles.size, 2);
  assert.ok(f.mutations.every(sql => sql.includes('user_display_profiles') && !sql.includes('user_expectations') && !sql.includes('exploration_')));
});
test('资料服务故障保留已验证薯名，未匹配账号回退登录名；缓存到期能同步改名', async () => {
  let mode = 'first', calls = 0;
  const f = fixture(async () => { calls++; if (mode === 'fail') throw new Error('offline'); return mode === 'first' ? '莲花' : '新薯名'; });
  const user = { userId: 'id-1', username: '陶嘉欣', email: 'one@example.com' };
  assert.equal((await f.service.resolve(user, 'cookie')).name, '莲花');
  await f.service.resolve(user, 'cookie'); assert.equal(calls, 1);
  f.advance(); mode = 'changed'; assert.equal((await f.service.resolve(user, 'cookie')).name, '新薯名');
  f.advance(); mode = 'fail'; assert.equal((await f.service.resolve(user, 'cookie')).name, '新薯名');
  assert.equal((await f.service.resolve({ ...user, userId: 'id-2' }, 'cookie')).name, '陶嘉欣');
});
test('SSO 直接提供薯名时无需目录查询，未登录仍拒绝，不支持客户端冒名', async () => {
  const f = fixture(async () => { throw new Error('不应查询'); });
  assert.deepEqual(await f.service.resolve({ userId: 'same', redName: ' 莲花 ', username: '陶嘉欣' }), { owner: 'id:same', name: '莲花' });
  await assert.rejects(f.service.resolve({ redName: '莲花' }), error => error.status === 401);
  assert.equal(userIdentity({ userId: 'same', redName: 123, username: '陶嘉欣' }).name, '陶嘉欣');
});
test('目录查询仅向固定官方地址转发凭证，并按邮箱精确匹配，不取同名搜索首条', async () => {
  const oldFetch = global.fetch;
  let rows = [{ email: 'other@example.com', redName: '错误薯名' }, { email: 'USER@example.com', redName: '正确薯名' }];
  global.fetch = async (url, options) => {
    assert.equal(url.origin, 'https://city.xiaohongshu.com'); assert.equal(url.searchParams.get('value'), 'user@example.com');
    assert.equal(options.headers.Cookie, 'test-cookie'); assert.equal(options.redirect, 'error');
    return Response.json({ data: rows });
  };
  try {
    assert.equal(await lookupRedName('user@example.com', 'test-cookie'), '正确薯名');
    rows = [{ email: 'other@example.com', redName: '同名但非同账号' }]; assert.equal(await lookupRedName('user@example.com', 'test-cookie'), '');
    rows = [{ email: 'user@example.com', redName: '一' }, { email: 'user@example.com', redName: '二' }]; assert.equal(await lookupRedName('user@example.com', 'test-cookie'), '');
    assert.equal(await lookupRedName('user@example.com', ''), '');
  } finally { global.fetch = oldFetch; }
});
