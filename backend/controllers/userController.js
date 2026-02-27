// controllers/userController.js
const userService = require('../services/userService.js');
const authService = require('../services/authService.js');
const { ROLES } = require('../middleware/authMiddleware.js');

const isAdmin = (roleId) => [ROLES.ADMIN, ROLES.SUPERADMIN].includes(roleId);

exports.changePassword = async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        const { current_password, new_password, confirm_password } = req.body || {};

        if (!new_password || !confirm_password) {
            return res.status(400).json({ message: 'new_password y confirm_password son requeridos' });
        }
        if (new_password !== confirm_password) {
            return res.status(400).json({ message: 'Las contraseñas no coinciden' });
        }
        if (new_password.length < 8) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres' });
        }

        const isRequesterAdmin = isAdmin(req.user.role_id);

        if (!isRequesterAdmin) {
            if (!current_password) {
                return res.status(400).json({ message: 'current_password es requerida para cambiar tu propia contraseña' });
            }
            const pwdRow = await userService.getPasswordHashById(targetUserId);
            if (!pwdRow) return res.status(404).json({ message: 'Usuario no encontrado' });

            const ok = await authService.comparePassword(current_password, pwdRow.password);
            if (!ok) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
        } else {
            const exists = await userService.getById(targetUserId);
            if (!exists) return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const hash = await authService.hashPassword(new_password);
        const updated = await userService.setPasswordHash(targetUserId, hash);

        return res.json({ message: 'Contraseña actualizada', user_id: updated.user_id });
    } catch (e) {
        console.error('changePassword error:', e);
        return res.status(500).json({ message: 'Error al cambiar la contraseña' });
    }
};

exports.list = async (req, res) => {
    try {
        const data = await userService.getAll();
        res.json(data);
    } catch (e) { res.status(500).json({ message: 'Error al obtener usuarios' }); }
};

exports.get = async (req, res) => {
    try {
        const u = await userService.getById(req.params.id);
        if (!u) return res.status(404).json({ message: 'No encontrado' });
        res.json(u);
    } catch (e) { res.status(500).json({ message: 'Error al obtener usuario' }); }
};

exports.create = async (req, res) => {
    try {
        const { name, last_name, email, password, role_id, department_id } = req.body;
        if (!name?.trim() || !last_name?.trim() || !email?.trim() || !password?.trim() || !role_id) {
            return res.status(400).json({ message: 'Campos obligatorios: name, last_name, email, password, role_id' });
        }
        const u = await userService.create({ name, last_name, email, password, role_id, department_id });
        res.status(201).json(u);
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ message: 'Email ya registrado' });
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};

exports.update = async (req, res) => {
    try {
        const u = await userService.update(req.params.id, req.body);
        if (!u) return res.status(404).json({ message: 'No encontrado / sin cambios' });
        res.json(u);
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ message: 'Email ya registrado' });
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
};

exports.remove = async (req, res) => {
    try {
        const ok = await userService.remove(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Usuario eliminado' });
    } catch (e) { res.status(500).json({ message: 'Error al eliminar usuario' }); }
};

exports.listPaged = async (req, res) => {
    try {
        const result = await userService.listPaged(req.query);
        res.json(result);
    } catch (e) {
        res.status(500).json({ message: 'Error al listar usuarios' });
    }
};

//
// NUEVO: búsqueda para autocomplete
//
exports.search = async (req, res) => {
    try {
        const { q = '', limit = 10, department_id } = req.query;
        const rows = await userService.search({ q, limit, department_id });
        res.json(rows);
    } catch (e) {
        console.error('users.search error:', e);
        res.status(500).json({ message: 'Error en búsqueda de usuarios' });
    }
};
