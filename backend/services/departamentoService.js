//services/departamentoService.js
const pool = require('../models/db.js');

async function getAll() {
  const { rows } = await pool.query(`
    SELECT department_id, name AS department_name, created_at, updated_at
    FROM departments
    ORDER BY name ASC
  `);
  return rows;
};

async function getById(id) {
  const { rows } = await pool.query(`
    SELECT department_id, name AS department_name, created_at, updated_at
    FROM departments
    WHERE department_id = $1
  `, [id]);
  return rows[0];
};

async function create({ name }) {
  const { rows } = await pool.query(`
    INSERT INTO departments (name)
    VALUES ($1)
    RETURNING department_id, name AS department_name, created_at, updated_at
  `, [name]);
  return rows[0];
};

async function update(id, { name }) {
  const { rows } = await pool.query(`
    UPDATE departments
    SET name = $1
    WHERE department_id = $2
    RETURNING department_id, name AS department_name, created_at, updated_at
  `, [name, id]);
  return rows[0];
};

async function remove(id) {
  const r = await pool.query(`DELETE FROM departments WHERE department_id = $1`, [id]);
  return r.rowCount > 0;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
}