'use strict';
const { HTTPException } = require('hono/http-exception');
const SCHEMA = `
CREATE TABLE IF NOT EXISTS exploration_sessions (
  id UUID PRIMARY KEY, owner_key TEXT NOT NULL, display_name TEXT NOT NULL,
  device TEXT NOT NULL, source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL, last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(), active_ms BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS exploration_events (
  id UUID PRIMARY KEY, session_id UUID NOT NULL REFERENCES exploration_sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL, name TEXT NOT NULL, step TEXT NOT NULL, node TEXT NOT NULL DEFAULT 'overview', artifact TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL, duration INTEGER NOT NULL CHECK(duration BETWEEN 0 AND 15000),
  UNIQUE(session_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_exploration_started ON exploration_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exploration_events_session ON exploration_events(session_id, seq);
`;
function createAnalyticsRepository(database) {
  let ready;
  async function db() {
    const pool = await database();
    if (!ready) ready = pool.query(SCHEMA).catch((error) => { ready = null; throw error; });
    await ready; return pool;
  }
  const range = '($1::int=0 OR s.started_at >= NOW()-($1::int * INTERVAL \'1 day\'))';
  const flags = `BOOL_OR(e.name='story_complete') AS completed, BOOL_OR(e.name='memory_card_open') AS memory,
    BOOL_OR(e.name='expectation_submit') AS expectation`;
  return {
    async record(user, batch) {
      const client = await (await db()).connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO exploration_sessions(id,owner_key,display_name,device,source,started_at)
          VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
        [batch.sessionId, user.owner, user.name, batch.device, batch.source, batch.events[0].at]);
        const session = await client.query('SELECT owner_key FROM exploration_sessions WHERE id=$1 FOR UPDATE', [batch.sessionId]);
        if (session.rows[0]?.owner_key !== user.owner) throw new HTTPException(409, { message: '访问账号已变化。' });
        const inserted = await client.query(`INSERT INTO exploration_events(id,session_id,seq,name,step,node,artifact,occurred_at,duration)
          SELECT x.id::uuid,$1::uuid,x.seq,x.name,x.step,x.node,x.artifact,x.at::timestamptz,x.duration
          FROM jsonb_to_recordset($2::jsonb) AS x(id text, seq int, name text, step text, node text, artifact text, at text, duration int)
          ON CONFLICT DO NOTHING RETURNING duration`, [batch.sessionId, JSON.stringify(batch.events)]);
        const duration = inserted.rows.reduce((sum, row) => sum + row.duration, 0);
        await client.query(`UPDATE exploration_sessions SET active_ms=active_ms+$2, last_seen=NOW(), display_name=$3 WHERE id=$1`,
          [batch.sessionId, duration, user.name]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async report({ days }) {
      const pool = await db();
      const [overview, steps, daily, completions] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS visits, COUNT(DISTINCT owner_key)::int AS accounts,
          COALESCE(SUM(active_ms),0)::float8 AS active_ms, COALESCE(AVG(active_ms),0)::float8 AS average_ms,
          COUNT(*) FILTER(WHERE device='mobile')::int AS mobile, MIN(started_at) AS first_visit FROM exploration_sessions s WHERE ${range}`, [days]),
        pool.query(`SELECT e.step, SUM(e.duration)::float8 AS active_ms, COUNT(DISTINCT e.session_id)::int AS visits,
          COUNT(DISTINCT s.owner_key)::int AS accounts FROM exploration_events e JOIN exploration_sessions s ON s.id=e.session_id
          WHERE ${range} GROUP BY e.step ORDER BY SUM(e.duration) DESC`, [days]),
        pool.query(`SELECT TO_CHAR(s.started_at AT TIME ZONE 'Asia/Shanghai','YYYY-MM-DD') AS day,
          COUNT(*)::int AS visits, COUNT(DISTINCT owner_key)::int AS accounts FROM exploration_sessions s WHERE ${range}
          GROUP BY day ORDER BY day DESC LIMIT 30`, [days]),
        pool.query(`SELECT COUNT(*) FILTER(WHERE completed)::int AS completed, COUNT(*) FILTER(WHERE memory)::int AS memory,
          COUNT(*) FILTER(WHERE expectation)::int AS expectation FROM (SELECT s.id, ${flags}
          FROM exploration_sessions s LEFT JOIN exploration_events e ON s.id=e.session_id WHERE ${range} GROUP BY s.id) x`, [days]),
      ]);
      return { overview: overview.rows[0], steps: steps.rows, daily: daily.rows, completions: completions.rows[0] };
    },
    async sessions({ days, page }) {
      const pool = await db();
      const [items, count] = await Promise.all([
        pool.query(`SELECT s.id,COALESCE(NULLIF(p.red_name,''),s.display_name) AS display_name,s.device,s.source,s.started_at,s.last_seen,s.active_ms::float8,
          last_event.step AS last_step, COALESCE(f.completed,false) AS completed, COALESCE(f.memory,false) AS memory,
          COALESCE(f.expectation,false) AS expectation FROM exploration_sessions s
          LEFT JOIN user_display_profiles p ON p.owner_key=s.owner_key
          LEFT JOIN LATERAL (SELECT step FROM exploration_events WHERE session_id=s.id ORDER BY seq DESC LIMIT 1) last_event ON true
          LEFT JOIN LATERAL (SELECT ${flags} FROM exploration_events e WHERE e.session_id=s.id) f ON true
          WHERE ${range} ORDER BY s.started_at DESC,s.id LIMIT 30 OFFSET $2`, [days, (page - 1) * 30]),
        pool.query(`SELECT COUNT(*)::int AS total FROM exploration_sessions s WHERE ${range}`, [days]),
      ]);
      return { items: items.rows, total: count.rows[0].total, page, pageSize: 30 };
    },
    async detail(id) {
      const pool = await db();
      const session = await pool.query(`SELECT s.id,COALESCE(NULLIF(p.red_name,''),s.display_name) AS display_name,
        s.started_at,s.last_seen,s.active_ms::float8,s.device,s.source FROM exploration_sessions s
        LEFT JOIN user_display_profiles p ON p.owner_key=s.owner_key WHERE s.id=$1`, [id]);
      if (!session.rows[0]) return null;
      const events = await pool.query(`SELECT seq,name,step,node,artifact,occurred_at,duration FROM exploration_events WHERE session_id=$1 ORDER BY seq LIMIT 10000`, [id]);
      return { session: session.rows[0], events: events.rows, truncated: events.rows.length === 10000 };
    },
  };
}
module.exports = { createAnalyticsRepository };
