// services/categoriasService.js
const pool = require('../models/db.js');

async function getAll() {
  const { rows } = await pool.query(`
    SELECT category_id, name, created_at, updated_at
    FROM categories
    ORDER BY name ASC
  `);
  return rows;
};

async function getById(id) {
  const { rows } = await pool.query(`
    SELECT category_id, name, created_at, updated_at
    FROM categories
    WHERE category_id = $1
  `, [id]);
  return rows[0];
};

async function create({ name }) {
  const { rows } = await pool.query(`
    INSERT INTO categories (name)
    VALUES ($1)
    RETURNING category_id, name, created_at, updated_at
  `, [name]);
  return rows[0];
};

async function update(id, { name }) {
  const { rows } = await pool.query(`
    UPDATE categories
    SET name = $1
    WHERE category_id = $2
    RETURNING category_id, name, created_at, updated_at
  `, [name, id]);
  return rows[0];
};

async function remove(id) {
  const r = await pool.query(`DELETE FROM categories WHERE category_id = $1`, [id]);
  return r.rowCount > 0;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
}