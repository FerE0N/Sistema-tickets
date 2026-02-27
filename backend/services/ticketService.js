// services/ticketService.js
const pool = require('../models/db.js');

// helper: SELECT base con joins
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

exports.getAllTickets = async () => {
  const { rows } = await pool.query(`${SELECT_JOINED} ORDER BY t.created_at DESC`);
  return rows;
};

exports.getTicketById = async (id) => {
  const { rows } = await pool.query(`${SELECT_JOINED} WHERE t.ticket_id = $1`, [id]);
  return rows[0];
};

// listPaged con filtros (actualiza tu versión)
exports.listPaged = async (query) => {
  const {
    page = 1, pageSize = 10,
    sort = 't.created_at', dir = 'DESC',
    q, status, category_id, agent_id, responsible_id,
    from, to,
    mine, userId, // 👈 añadidos
  } = query;

  const where = [];
  const params = [];
  let i = 1;

  // ...tus otros filtros (q, status, category_id, from/to, etc.)...

  if (mine && userId) {
    where.push(`(t.agent_id = $${i} OR t.responsible_id = $${i})`);
    params.push(Number(userId)); i++;
  } else {
    if (agent_id) { where.push(`t.agent_id = $${i}`); params.push(Number(agent_id)); i++; }
    if (responsible_id) { where.push(`t.responsible_id = $${i}`); params.push(Number(responsible_id)); i++; }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // SELECT con tus JOINs para category_name, agent_name, responsible_name
  const dataSql = `
    SELECT
      t.ticket_id, t.subject, t.status, t.category_id, t.agent_id, t.responsible_id,
      t.created_at, t.updated_at,
      c.name AS category_name,
      ua.name || ' ' || ua.last_name AS agent_name,
      ur.name || ' ' || ur.last_name AS responsible_name
    FROM tickets t
    LEFT JOIN categories c ON c.category_id = t.category_id
    LEFT JOIN users ua ON ua.user_id = t.agent_id
    LEFT JOIN users ur ON ur.user_id = t.responsible_id
    ${whereSql}
    ORDER BY ${sort} ${dir}
    LIMIT $${i} OFFSET $${i + 1}
  `;
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM tickets t
    ${whereSql}
  `;

  const limit = Math.max(1, Math.min(100, Number(pageSize)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataSql, [...params, limit, offset]),
    pool.query(countSql, params),
  ]);

  const total = countRes.rows[0].total;
  return {
    page: Number(page),
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: dataRes.rows,
  };
};

exports.createTicket = async (data) => {
  const { subject, category_id, responsible_id, agent_id, status, description } = data;
  const { rows } = await pool.query(`
    INSERT INTO tickets (subject, category_id, responsible_id, agent_id, status, description)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING ticket_id
  `, [subject, category_id, responsible_id, agent_id, status, description]);

  return exports.getTicketById(rows[0].ticket_id); // reselect con joins
};

exports.updateTicket = async (id, data) => {
  const { subject, category_id, responsible_id, agent_id, status, description } = data;
  const fields = []; const values = []; let i = 1;
  if (subject !== undefined) { fields.push(`subject = $${i++}`); values.push(subject); }
  if (category_id !== undefined) { fields.push(`category_id = $${i++}`); values.push(category_id); }
  if (responsible_id !== undefined) { fields.push(`responsible_id = $${i++}`); values.push(responsible_id); }
  if (agent_id !== undefined) { fields.push(`agent_id = $${i++}`); values.push(agent_id); }
  if (status !== undefined) { fields.push(`status = $${i++}`); values.push(status); }
  if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description); }

  if (!fields.length) return exports.getTicketById(id);

  values.push(id);
  await pool.query(`UPDATE tickets SET ${fields.join(', ')} WHERE ticket_id = $${i}`, values);
  return exports.getTicketById(id); // reselect con joins
};

exports.deleteTicket = async (id) => {
  await pool.query(`DELETE FROM tickets WHERE ticket_id = $1`, [id]);
};