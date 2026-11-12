'use strict';
const { userIdentity } = require('./expectations');

const DIRECTORY_URL = 'https://city.xiaohongshu.com/oasis/api/ehr/common/commonController/findUserInfoByValue';
const cleanName = (value) => typeof value === 'string' ? value.trim().slice(0, 120) : '';
const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';

/** 只按已验证的 SSO 邮箱精确匹配；不会根据同名、搜索首条或客户端提交的昵称认领。 */
async function lookupRedName(email, cookie) {
  if (!email || !cookie) return '';
  const url = new URL(DIRECTORY_URL);
  url.searchParams.set('value', email);
  url.searchParams.set('isIncludingLeaving', 'false');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(url, { headers: { Cookie: cookie, Accept: 'application/json' }, signal: controller.signal, redirect: 'error' });
    if (!response.ok) return '';
    const data = await response.json();
    const matches = (Array.isArray(data.data) ? data.data : []).filter((row) =>
      [row.email, row.redEmail].some((value) => normalizeEmail(value) === email));
    const names = [...new Set(matches.map((row) => cleanName(row.redName)).filter(Boolean))];
    return names.length === 1 ? names[0] : '';
  } finally { clearTimeout(timer); }
}

function createUserProfiles({ database, lookup = lookupRedName, now = Date.now }) {
  const cache = new Map(), pending = new Map();
  async function resolve(user, cookie) {
    const identity = userIdentity(user);
    const email = normalizeEmail(user.email ?? user.workEmail);
    const key = `${identity.owner}\n${email}`;
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return { ...identity, name: cached.name || identity.name };
    if (pending.has(key)) return { ...identity, name: await pending.get(key) || identity.name };
    const task = (async () => {
      let previous = '';
      try {
        const pool = await database();
        const result = await pool.query('SELECT red_name FROM user_display_profiles WHERE owner_key=$1', [identity.owner]);
        previous = cleanName(result.rows[0]?.red_name);
        const redName = cleanName(user.redName) || await lookup(email, cookie);
        if (redName) {
          await pool.query(`INSERT INTO user_display_profiles(owner_key,red_name,updated_at) VALUES($1,$2,NOW())
            ON CONFLICT(owner_key) DO UPDATE SET red_name=EXCLUDED.red_name,updated_at=NOW()`, [identity.owner, redName]);
          return redName;
        }
      } catch { /* 薯名服务或数据库失败不阻断故事；保留已验证的历史名称。 */ }
      return previous;
    })();
    pending.set(key, task);
    try {
      const name = await task;
      // 只缓存展示名，鉴权与账号归属每次重新读取 SSO；最多三分钟同步改名。
      if (cache.size >= 500) cache.delete(cache.keys().next().value);
      cache.set(key, { name, expires: now() + (name ? 180000 : 30000) });
      return { ...identity, name: name || identity.name };
    } finally { pending.delete(key); }
  }
  return { resolve };
}
module.exports = { createUserProfiles, lookupRedName };
