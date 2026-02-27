// backend/controllers/authController.js
const pool = require('../models/db.js');
const authService = require('../services/authService.js');

async function login(req, res) {
    const { email, password } = req.body;
    const q = 'SELECT * FROM Users WHERE email = $1';
    try {
        console.log('[AUTH] /login body:', req.body); // 👈 log
        const { rows } = await pool.query(q, [email]);
        if (!rows.length) return res.status(401).json({ message: 'Usuario no encontrado' });

        const user = rows[0];
        const ok = await authService.comparePassword(password, user.password);
        if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

        const { token } = authService.generateToken(user); // jti/exp se usan en logout en el servidor
        return res.json({
            token,
            user: { id: user.user_id, name: user.name, role_id: user.role_id, department_id: user.department_id }
        });
    } catch (err) {
        console.error('[AUTH] login error:', err);
        return res.status(500).json({ message: 'Error interno' });
    }
};

const { ROLES } = require('../middleware/authMiddleware');

async function register(req, res) {
    try {
        const { name, last_name, email, password, department_id } = req.body;

        if (!name?.trim() || !last_name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({ message: 'Campos obligatorios: name, last_name, email, password' });
        }

        const hash = await authService.hashPassword(password);

        // Forzar rol AUX en autoregistro
        const role_id = ROLES.AUX;

        const { rows } = await pool.query(`
      INSERT INTO Users (name, last_name, email, password, role_id, department_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, name, last_name, email, role_id, department_id
    `, [name, last_name, email, hash, role_id, department_id || null]);

        return res.status(201).json({ user: rows[0] });
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ message: 'Email ya registrado' });
        return res.status(500).json({ message: 'Error al registrar usuario' });
    }
};

async function forgotPassword(req, res) {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ message: 'Email requerido' });

        await authService.startPasswordReset(email);
        // Siempre responder 200 (para no filtrar usuarios existentes)
        return res.json({ ok: true, message: 'Si el correo existe, se envió un enlace de recuperación.' });
    } catch (e) {
        console.error('[forgotPassword]', e);
        return res.status(500).json({ message: 'Error al iniciar recuperación' });
    }
};

async function resetPassword(req, res) {
    try {
        const { token, password } = req.body || {};
        if (!token || !password) return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });

        await authService.completePasswordReset(token, password);
        return res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
    } catch (e) {
        console.error('[resetPassword]', e);
        const code = e.code === 'INVALID_TOKEN' ? 400 : 500;
        return res.status(code).json({ message: e.message || 'Error al restablecer contraseña' });
    }
};

module.exports = {
    login,
    register,
    forgotPassword,
    resetPassword
}