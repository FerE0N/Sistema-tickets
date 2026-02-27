// backend/controllers/departamentoController.js
const deptService = require('../services/departamentoService.js');
const pool = require("../models/db.js");

async function list(req, res) {
    try {
        const { rows } = await pool.query(
            `SELECT department_id, name FROM departments ORDER BY name ASC`
        );
        return res.json(rows); // ← array
    } catch (e) {
        console.error('departamentos.list error:', e);
        return res.status(500).json({ message: 'Error al obtener departamentos' });
    }
}

async function search(req, res) {
    try {
        const q = (req.query.q || '').trim();
        const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
        const { rows } = await pool.query(
            `SELECT department_id, name
         FROM departments
        WHERE name ILIKE $1
        ORDER BY name ASC
        LIMIT $2`,
            [`%${q}%`, limit]
        );
        return res.json(rows); // ← array
    } catch (e) {
        console.error('departamentos.search error:', e);
        return res.status(500).json({ message: 'Error en búsqueda de departamentos' });
    }
}

async function create(req, res) {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'name es requerido' });
        const dep = await deptService.create({ name });
        res.status(201).json(dep);
    } catch { res.status(500).json({ message: 'Error al crear departamento' }); }
}

async function update(req, res) {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: 'name es requerido' });
        const dep = await deptService.update(req.params.id, { name });
        if (!dep) return res.status(404).json({ message: 'No encontrado' });
        res.json(dep);
    } catch { res.status(500).json({ message: 'Error al actualizar departamento' }); }
}

async function remove(req, res) {
    try {
        const ok = await deptService.remove(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Departamento eliminado' });
    } catch { res.status(500).json({ message: 'Error al eliminar departamento' }); }
}

module.exports = { list, search, create, update, remove };
