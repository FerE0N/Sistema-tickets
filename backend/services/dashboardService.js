// services/dashboardService.js
const pool = require('../models/db');

function addRange(whereSql, params, from, to) {
  let sql = whereSql;
  if (from) { params.push(from); sql += ` AND t.created_at >= $${params.length}`; }
  if (to) { params.push(to); sql += ` AND t.created_at <  $${params.length}`; }
  return { sql, params };
}

async function summary({ scope, userId, from, to }) {
  let params = [];
  let where = 'WHERE 1=1';
  // scope
  if (scope === 'mine') {
    params.push(userId, userId);
    where += ` AND (t.agent_id = $${params.length - 1} OR t.responsible_id = $${params.length})`;
  }
  // rango
  ({ sql: where, params } = addRange(where, params, from, to));

  const sql = `
    SELECT
      COUNT(*) FILTER (WHERE t.status = 'abierto')::int      AS abiertos,
      COUNT(*) FILTER (WHERE t.status = 'en progreso')::int  AS en_progreso,
      COUNT(*) FILTER (WHERE t.status = 'cerrado')::int      AS cerrados,
      COUNT(*)::int                                         AS total
    FROM tickets t
    ${where}
  `;
  const { rows } = await pool.query(sql, params);
  return rows[0];
};

async function byStatus({ scope, userId, from, to }) {
  let params = [];
  let where = 'WHERE 1=1';
  if (scope === 'mine') {
    params.push(userId, userId);
    where += ` AND (t.agent_id = $${params.length - 1} OR t.responsible_id = $${params.length})`;
  }
  ({ sql: where, params } = addRange(where, params, from, to));
  const sql = `
    SELECT t.status, COUNT(*)::int AS count
    FROM tickets t
    ${where}
    GROUP BY t.status
    ORDER BY count DESC;
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
};

async function byCategory({ scope, userId, from, to }) {
  let params = [];
  let where = 'WHERE 1=1';
  if (scope === 'mine') {
    params.push(userId, userId);
    where += ` AND (t.agent_id = $${params.length - 1} OR t.responsible_id = $${params.length})`;
  }
  ({ sql: where, params } = addRange(where, params, from, to));
  const sql = `
    SELECT c.name AS category_name, COUNT(*)::int AS count
    FROM tickets t
    LEFT JOIN categories c ON c.category_id = t.category_id
    ${where}
    GROUP BY c.name
    ORDER BY count DESC, c.name;
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
};

async function byDay({ scope, userId, days, from, to }) {
  // si viene from/to, los usamos; si no, últimos N días
  let params = [];
  let where = 'WHERE 1=1';

  if (from || to) {
    ({ sql: where, params } = addRange(where, params, from, to));
  } else {
    params.push(days);
    where += ` AND t.created_at >= (NOW() - ($${params.length} || ' days')::interval)`;
  }

  if (scope === 'mine') {
    params.push(userId, userId);
    where += ` AND (t.agent_id = $${params.length - 1} OR t.responsible_id = $${params.length})`;
  }

  const sql = `
    SELECT
      date_trunc('day', t.created_at)::date AS day,
      COUNT(*)::int AS count
    FROM tickets t
    ${where}
    GROUP BY day
    ORDER BY day;
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
};

async function byAgent({ scope, userId, from, to }) {
  // byAgent solo tiene sentido en scope=all (carga por agente)
  // si viniera 'mine' devolvemos vacío
  if (scope !== 'all') return [];

  let params = [];
  let where = 'WHERE 1=1';
  ({ sql: where, params } = addRange(where, params, from, to));

  const sql = `
    SELECT
      a.user_id,
      (a.name || ' ' || a.last_name) AS agent_name,
      COUNT(*)::int AS count
    FROM tickets t
    LEFT JOIN users a ON a.user_id = t.agent_id
    ${where}
    GROUP BY a.user_id, a.name, a.last_name
    ORDER BY count DESC, agent_name;
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
};

module.exports = {
  summary,
  byStatus,
  byCategory,
  byDay,
  byAgent
}