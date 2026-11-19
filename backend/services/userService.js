// services/userService.js
const pool = require('../models/db.js');

exports.getAll = async () => {
  const { rows } = await pool.query(`
    SELECT 
      u.user_id, u.name, u.last_name, u.email,
      u.role_id, r.name AS role_name,
      u.department_id, d.name AS department_name,
      u.created_at, u.updated_at
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN departments d ON d.department_id = u.department_id
    ORDER BY u.user_id ASC
  `);
  return rows;
};

exports.getById = async (id) => {
  const { rows } = await pool.query(`
    SELECT 
      u.user_id, u.name, u.last_name, u.email,
      u.role_id, r.name AS role_name, u.department_id, d.name AS department_name,
      u.created_at, u.updated_at
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN departments d ON d.department_id = u.department_id
    WHERE u.user_id = $1
  `, [id]);
  return rows[0];
};

exports.create = async ({ name, last_name, email, password, role_id, department_id }) => {
  const { rows } = await pool.query(`
    INSERT INTO users (name, last_name, email, password, role_id, department_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING user_id, name, last_name, email, role_id, department_id, created_at, updated_at
  `, [name, last_name, email, password, role_id, department_id]);
  return rows[0];
};

exports.update = async (id, payload) => {
  const { name, last_name, email, role_id, department_id, password } = payload;

  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (last_name !== undefined) { fields.push(`last_name = $${i++}`); values.push(last_name); }
  if (email !== undefined) { fields.push(`email = $${i++}`); values.push(email); }
  if (role_id !== undefined) { fields.push(`role_id = $${i++}`); values.push(role_id); }
  if (department_id !== undefined) { fields.push(`department_id = $${i++}`); values.push(department_id); }
  if (password !== undefined) { fields.push(`password = $${i++}`); values.push(password); }

  if (!fields.length) return null;

  values.push(id);
  const { rows } = await pool.query(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE user_id = $${i}
    RETURNING user_id, name, last_name, email, role_id, department_id, created_at, updated_at
  `, values);

  return rows[0];
};

exports.remove = async (id) => {
  const r = await pool.query(`DELETE FROM users WHERE user_id = $1`, [id]);
  return r.rowCount > 0;
};

exports.getPasswordHashById = async (id) => {
  const { rows } = await pool.query(
    `SELECT user_id, password FROM users WHERE user_id = $1`, [id]
  );
  return rows[0];
};

exports.setPasswordHash = async (id, hash) => {
  const { rows } = await pool.query(
    `UPDATE users SET password = $1 WHERE user_id = $2 RETURNING user_id, updated_at`,
    [hash, id]
  );
  return rows[0];
};

exports.listPaged = async ({
  page = 1, pageSize = 10,
  sort = 'u.user_id', dir = 'ASC',
  q, role_id, department_id
}) => {
  const allowedSort = new Set(['u.user_id', 'u.name', 'u.email', 'u.created_at', 'u.updated_at']);
  const allowedDir = new Set(['ASC', 'DESC']);

  const orderBy = allowedSort.has(sort) ? sort : 'u.user_id';
  const orderDir = allowedDir.has(String(dir || '').toUpperCase()) ? String(dir).toUpperCase() : 'ASC';

  const limit = Math.max(1, Math.min(100, Number(pageSize)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;

  const where = [];
  const params = [];
  let i = 1;

  if (q) { where.push(`(u.name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i})`); params.push(`%${q}%`); i++; }
  if (role_id) { where.push(`u.role_id = $${i}`); params.push(Number(role_id)); i++; }
  if (department_id) { where.push(`u.department_id = $${i}`); params.push(Number(department_id)); i++; }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const dataSql = `
    SELECT u.user_id, u.name, u.last_name, u.email,
           u.role_id, r.name AS role_name,
           u.department_id, d.name AS department_name,
           u.created_at, u.updated_at
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN departments d ON d.department_id = u.department_id
    ${whereSql}
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $${i} OFFSET $${i + 1}
  `;
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM users u
    ${whereSql}
  `;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataSql, [...params, limit, offset]),
    pool.query(countSql, params)
  ]);

  const total = countRes.rows[0].total;
  return {
    page: Number(page),
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: dataRes.rows
  };
};

// Búsqueda para autocompletar (filtro opcional por department_id)
exports.search = async ({ q = '', limit = 10, department_id }) => {
  const lim = Math.max(1, Math.min(50, Number(limit)));
  const params = [];
  let i = 1;

  let where = '(u.name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1)';
  params.push(`%${q}%`); i++;

  if (department_id) {
    where += ` AND u.department_id = $${i}`;
    params.push(Number(department_id)); i++;
  }

  const sql = `
    SELECT 
      u.user_id, u.name, u.last_name, u.email,
      u.role_id, r.name AS role_name,
      u.department_id, d.name AS department_name
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN departments d ON d.department_id = u.department_id
    WHERE ${where}
    ORDER BY u.name ASC
    LIMIT $${i}
  `;
  params.push(lim);

  const { rows } = await pool.query(sql, params);
  return rows;
};
