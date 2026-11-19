// services/ticketService.js
const pool = require('../models/db');

const STATUSES = ['abierto', 'en progreso', 'cerrado'];

const SELECT_JOINED = `
  SELECT
    t.ticket_id, t.subject, t.category_id, c.name AS category_name,
    t.responsible_id, COALESCE(ur.name || ' ' || ur.last_name, '-') AS responsible_name,
    t.agent_id, COALESCE(ua.name || ' ' || ua.last_name, '-') AS agent_name,
    t.status, t.description,
    t.created_at, t.updated_at
  FROM tickets t
  LEFT JOIN categories c ON c.category_id = t.category_id
  LEFT JOIN users ur ON ur.user_id = t.responsible_id
  LEFT JOIN users ua ON ua.user_id = t.agent_id
`;

// Columnas por las que se permite ordenar (lista blanca: evita inyección SQL en ORDER BY)
const SORTABLE = {
  ticket_id: 't.ticket_id',
  subject: 't.subject',
  status: 't.status',
  created_at: 't.created_at',
  updated_at: 't.updated_at',
  category_name: 'c.name',
  agent_name: 'ua.name',
  responsible_name: 'ur.name',
};

function resolveSort(sort) {
  const key = String(sort || '').replace(/^t\./, '');
  return SORTABLE[key] || 't.created_at';
}

/** Lista simple. Si se pasa visibleTo, solo devuelve tickets donde ese usuario es agente o responsable. */
exports.getAllTickets = async ({ visibleTo } = {}) => {
  if (visibleTo) {
    const { rows } = await pool.query(
      `${SELECT_JOINED} WHERE t.agent_id = $1 OR t.responsible_id = $1 ORDER BY t.created_at DESC`,
      [visibleTo]
    );
    return rows;
  }
  const { rows } = await pool.query(`${SELECT_JOINED} ORDER BY t.created_at DESC`);
  return rows;
};

exports.getTicketById = async (id) => {
  const { rows } = await pool.query(`${SELECT_JOINED} WHERE t.ticket_id = $1`, [id]);
  return rows[0];
};

/**
 * Listado paginado con filtros.
 * @param {object} f
 * @param {string} [f.q]            texto en asunto o descripción
 * @param {string} [f.status]
 * @param {number} [f.category_id]
 * @param {number} [f.agent_id]
 * @param {number} [f.responsible_id]
 * @param {number} [f.mine]         id de usuario: tickets donde es agente o responsable
 * @param {string} [f.from] [f.to]  rango de fechas de creación (YYYY-MM-DD, "to" inclusivo)
 */
exports.listPaged = async (f = {}) => {
  const where = [];
  const params = [];
  const add = (sql, value) => { params.push(value); where.push(sql.replaceAll('$?', `$${params.length}`)); };

  if (f.q) add(`(t.subject ILIKE $? OR t.description ILIKE $?)`, `%${f.q}%`);
  if (f.status && STATUSES.includes(f.status)) add('t.status = $?', f.status);
  if (f.category_id) add('t.category_id = $?', Number(f.category_id));
  if (f.mine) add('(t.agent_id = $? OR t.responsible_id = $?)', Number(f.mine));
  if (f.agent_id) add('t.agent_id = $?', Number(f.agent_id));
  if (f.responsible_id) add('t.responsible_id = $?', Number(f.responsible_id));
  if (f.from) add('t.created_at >= $?::date', f.from);
  if (f.to) add(`t.created_at < ($?::date + INTERVAL '1 day')`, f.to);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = resolveSort(f.sort);
  const orderDir = String(f.dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const limit = Math.max(1, Math.min(100, Number(f.pageSize) || 10));
  const page = Math.max(1, Number(f.page) || 1);
  const offset = (page - 1) * limit;

  const dataSql = `${SELECT_JOINED} ${whereSql}
    ORDER BY ${orderBy} ${orderDir}, t.ticket_id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*)::int AS total FROM tickets t ${whereSql}`;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataSql, [...params, limit, offset]),
    pool.query(countSql, params),
  ]);

  const total = countRes.rows[0].total;
  return { page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), items: dataRes.rows };
};

exports.createTicket = async ({ subject, category_id, responsible_id, agent_id, status = 'abierto', description }) => {
  const { rows } = await pool.query(`
    INSERT INTO tickets (subject, category_id, responsible_id, agent_id, status, description)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ticket_id
  `, [subject, category_id, responsible_id, agent_id, status, description ?? null]);
  return exports.getTicketById(rows[0].ticket_id);
};

exports.updateTicket = async (id, data) => {
  const allowed = ['subject', 'category_id', 'responsible_id', 'agent_id', 'status', 'description'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }
  if (!fields.length) return exports.getTicketById(id);

  values.push(id);
  await pool.query(`UPDATE tickets SET ${fields.join(', ')} WHERE ticket_id = $${values.length}`, values);
  return exports.getTicketById(id);
};

exports.deleteTicket = async (id) => {
  await pool.query('DELETE FROM tickets WHERE ticket_id = $1', [id]);
};

exports.STATUSES = STATUSES;
