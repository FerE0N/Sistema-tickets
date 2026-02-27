// backend/controllers/categoriasController.js
const pool = require('../models/db'); // o usa un service si ya lo tienes

const svc = require('../services/categoriaService');

async function list(req, res) {
    try { const data = await svc.getAll(); res.json(data); }
    catch { res.status(500).json({ message: 'Error al obtener categorías' }); }
}

async function get(req, res) {
    try {
        const row = await svc.getById(req.params.id);
        if (!row) return res.status(404).json({ message: 'No encontrada' });
        res.json(row);
    } catch { res.status(500).json({ message: 'Error al obtener la categoría' }); }
}

async function create(req, res) {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'name es requerido' });
        const row = await svc.create({ name });
        res.status(201).json(row);
    } catch { res.status(500).json({ message: 'Error al crear categoría' }); }
}

async function update(req, res) {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'name es requerido' });
        const row = await svc.update(req.params.id, { name });
        if (!row) return res.status(404).json({ message: 'No encontrada' });
        res.json(row);
    } catch { res.status(500).json({ message: 'Error al actualizar categoría' }); }
}

async function remove(req, res) {
    try {
        const ok = await svc.remove(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrada' });
        res.json({ message: 'Categoría eliminada' });
    } catch { res.status(500).json({ message: 'Error al eliminar categoría' }); }
}

async function search(req, res) {
    try {
        const { q = '', limit = 10 } = req.query;
        const lim = Math.max(1, Math.min(50, Number(limit)));
        const { rows } = await pool.query(
            `SELECT category_id, name
            FROM categories
            WHERE name ILIKE $1
            ORDER BY name ASC
            LIMIT $2`,
            [`%${q}%`, lim]
        );
        res.json(rows);
    } catch (e) {
        console.error('categorias.search error:', e);
        res.status(500).json({ message: 'Error en búsqueda de categorías' });
    }
}

// 👇 Exporta también search
module.exports = { list, get, create, update, remove, search };