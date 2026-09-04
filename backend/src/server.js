/**
 * 《物语千年》Cowork 子应用后端。
 *
 * 职责（第一期）：
 *  1. 托管 frontend/dist 静态产物 + SPA fallback
 *  2. 解析平台注入的 SSO 用户身份
 *  3. 顶层 /health 供 Guard 探活
 *
 * 第二期会在这里加 POST /api/chat，把 system prompt 转发给 Runway 网关。
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
