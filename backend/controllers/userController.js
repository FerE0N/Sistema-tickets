// controllers/userController.js
const userService = require('../services/userService.js');
const authService = require('../services/authService.js');
const { ROLES, isAdmin } = require('../middleware/authMiddleware.js');

const VALID_ROLES = Object.values(ROLES);

// Solo un superadmin puede crear/promover superadmins o modificar a otro superadmin
async function checkRoleChange(req, targetUserId, newRoleId) {
    if (req.user.role_id === ROLES.SUPERADMIN) return null;
    if (newRoleId !== undefined && Number(newRoleId) === ROLES.SUPERADMIN) {
        return 'Solo un superadmin puede asignar el rol superadmin';
    }
    if (targetUserId) {
        const target = await userService.getById(targetUserId);
        if (target && target.role_id === ROLES.SUPERADMIN && Number(targetUserId) !== Number(req.user.id)) {
            return 'No puedes modificar a un superadmin';
        }
    }
    return null;
}

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
        if (new_password.length < authService.MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `La nueva contraseña debe tener al menos ${authService.MIN_PASSWORD_LENGTH} caracteres` });
        }

        // Un admin puede forzar el cambio de otra cuenta; para la propia siempre se pide la actual
        const isRequesterAdmin = isAdmin(req.user.role_id) && Number(req.user.id) !== targetUserId;
        if (isRequesterAdmin) {
            const denied = await checkRoleChange(req, targetUserId);
            if (denied) return res.status(403).json({ message: denied });
        }

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
        if (!VALID_ROLES.includes(Number(role_id))) return res.status(400).json({ message: 'role_id no válido' });
        if (password.length < authService.MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `La contraseña debe tener al menos ${authService.MIN_PASSWORD_LENGTH} caracteres` });
        }
        const denied = await checkRoleChange(req, null, role_id);
        if (denied) return res.status(403).json({ message: denied });

        const hash = await authService.hashPassword(password);
        const u = await userService.create({
            name: name.trim(), last_name: last_name.trim(), email: email.trim().toLowerCase(),
            password: hash, role_id: Number(role_id), department_id: department_id || null,
        });
        res.status(201).json(u);
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ message: 'Email ya registrado' });
        console.error('users.create error:', e.message);
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};

exports.update = async (req, res) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        const payload = { ...req.body };

        if (!isAdmin(req.user.role_id)) {
            // Un auxiliar edita sus datos, pero no puede cambiar su rol
            delete payload.role_id;
        } else {
            if (payload.role_id !== undefined && !VALID_ROLES.includes(Number(payload.role_id))) {
                return res.status(400).json({ message: 'role_id no válido' });
            }
            const denied = await checkRoleChange(req, targetId, payload.role_id);
            if (denied) return res.status(403).json({ message: denied });
        }

        // La contraseña se cambia con PATCH /users/:id/password (o un admin aquí, siempre con hash)
        if (payload.password !== undefined) {
            if (!isAdmin(req.user.role_id) || !payload.password) {
                delete payload.password;
            } else if (String(payload.password).length < authService.MIN_PASSWORD_LENGTH) {
                return res.status(400).json({ message: `La contraseña debe tener al menos ${authService.MIN_PASSWORD_LENGTH} caracteres` });
            } else {
                payload.password = await authService.hashPassword(payload.password);
            }
        }
        if (payload.email !== undefined) payload.email = String(payload.email).trim().toLowerCase();

        const u = await userService.update(targetId, payload);
        if (!u) return res.status(404).json({ message: 'No encontrado / sin cambios' });
        res.json(u);
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ message: 'Email ya registrado' });
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
};

exports.remove = async (req, res) => {
    try {
        if (Number(req.params.id) === Number(req.user.id)) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }
        const denied = await checkRoleChange(req, req.params.id);
        if (denied) return res.status(403).json({ message: denied });
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

// Búsqueda para autocompletar
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
