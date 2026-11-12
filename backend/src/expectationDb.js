'use strict';

const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS user_expectations (
  id UUID PRIMARY KEY,
  owner_key TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  artifact_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 80),
  source TEXT NOT NULL DEFAULT 'epilogue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_key, artifact_id)
);
CREATE INDEX IF NOT EXISTS idx_expectations_updated ON user_expectations (updated_at DESC, id);
CREATE TABLE IF NOT EXISTS user_display_profiles (
  owner_key TEXT PRIMARY KEY,
  red_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

/** 延迟连接；数据库故障只影响反馈功能，不阻断故事、静态资源或 AI。 */
function createExpectationRepository(props) {
  let pool;
  let schemaReady;
  async function db() {
    if (!props || props['db.type'] !== 'postgresql' ||
        !['db.host', 'db.port', 'db.username', 'db.password', 'db.database'].every((key) => props[key])) {
      throw new Error('expectation database unavailable');
    }
    if (!pool) {
      pool = new Pool({
        host: props['db.host'], port: Number(props['db.port']),
        user: props['db.username'], password: props['db.password'], database: props['db.database'],
        max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 8000,
      });
      pool.on('error', () => console.warn('[expectations] idle database connection failed'));
    }
    if (!schemaReady) schemaReady = pool.query(SCHEMA).catch((error) => { schemaReady = null; throw error; });
    await schemaReady;
    return pool;
  }
  function where(filters) {
    const params = [];
    const clauses = [];
    if (filters.q) {
      params.push(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
      clauses.push(`(e.content ILIKE $${params.length} OR e.display_name ILIKE $${params.length} OR p.red_name ILIKE $${params.length})`);
    }
    if (filters.days) { params.push(filters.days); clauses.push(`e.created_at >= NOW() - ($${params.length}::int * INTERVAL '1 day')`); }
    return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }
  const fields = 'id, artifact_id, content, source, created_at, updated_at';
  return {
    database: db,
    async get(owner, artifact) {
      const result = await (await db()).query(`SELECT ${fields} FROM user_expectations WHERE owner_key=$1 AND artifact_id=$2`, [owner, artifact]);
      return result.rows[0] ?? null;
    },
    async save(owner, name, artifact, content) {
      const result = await (await db()).query(`
        INSERT INTO user_expectations (id,owner_key,display_name,artifact_id,content) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (owner_key,artifact_id) DO UPDATE SET display_name=EXCLUDED.display_name,
          content=EXCLUDED.content, updated_at=NOW()
        RETURNING ${fields}`, [randomUUID(), owner, name, artifact, content]);
      return result.rows[0];
    },
    async remove(owner, artifact) {
      await (await db()).query('DELETE FROM user_expectations WHERE owner_key=$1 AND artifact_id=$2', [owner, artifact]);
    },
    async list(filters, limit, offset) {
      const { sql, params } = where(filters);
      const result = await (await db()).query(`SELECT e.id,e.artifact_id,e.content,e.source,e.created_at,e.updated_at,
        COALESCE(NULLIF(p.red_name,''),e.display_name) AS display_name FROM user_expectations e
        LEFT JOIN user_display_profiles p ON p.owner_key=e.owner_key ${sql}
        ORDER BY e.updated_at DESC,e.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
      return result.rows;
    },
    async count(filters) {
      const { sql, params } = where(filters);
      const result = await (await db()).query(`SELECT COUNT(*)::int AS total FROM user_expectations e
        LEFT JOIN user_display_profiles p ON p.owner_key=e.owner_key ${sql}`, params);
      return result.rows[0].total;
    },
    async summary() {
      const result = await (await db()).query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recent,
        COUNT(DISTINCT owner_key)::int AS participants FROM user_expectations`);
      return result.rows[0];
    },
  };
}

module.exports = { createExpectationRepository };
