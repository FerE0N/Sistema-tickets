// controllers/authController.js
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const authService = require('../services/authService');
const revokedSvc = require('../services/revokedTokenService');
const { ROLES } = require('../middleware/authMiddleware');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function login(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña son requeridos' });

    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
        const user = rows[0];
        // Mismo mensaje si el usuario no existe o la contraseña es incorrecta (evita enumerar cuentas)
        const ok = user && await authService.comparePassword(password, user.password);
        if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

        const { token } = authService.generateToken(user);
        return res.json({
            token,
            user: { id: user.user_id, name: user.name, role_id: user.role_id, department_id: user.department_id },
        });
    } catch (err) {
        console.error('[AUTH] login error:', err.message);
        return res.status(500).json({ message: 'Error interno' });
    }
}

async function register(req, res) {
    try {
        const { name, last_name, email, password, department_id } = req.body || {};

        if (!name?.trim() || !last_name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ message: 'Campos obligatorios: name, last_name, email, password' });
        }
        if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ message: 'Email no válido' });
        if (password.length < authService.MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `La contraseña debe tener al menos ${authService.MIN_PASSWORD_LENGTH} caracteres` });
        }

        const hash = await authService.hashPassword(password);

        // El autoregistro siempre crea cuentas con rol auxiliar
        const { rows } = await pool.query(`
            INSERT INTO users (name, last_name, email, password, role_id, department_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING user_id, name, last_name, email, role_id, department_id
        `, [name.trim(), last_name.trim(), email.trim().toLowerCase(), hash, ROLES.AUX, department_id || null]);

        return res.status(201).json({ user: rows[0] });
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ message: 'Email ya registrado' });
        console.error('[AUTH] register error:', e.message);
        return res.status(500).json({ message: 'Error al registrar usuario' });
    }
}

async function logout(req, res) {
    try {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const decoded = jwt.decode(token); // ya verificado por authenticate
        if (!decoded?.jti || !decoded?.exp) return res.status(400).json({ message: 'Token inválido para logout' });

        const expiresAt = new Date(decoded.exp * 1000);
        await revokedSvc.revoke({ jti: decoded.jti, user_id: req.user.id, expires_at: expiresAt });
        return res.json({ message: 'Sesión cerrada. Token revocado.' });
    } catch (err) {
        console.error('[AUTH] logout error:', err.message);
        return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
}

async function forgotPassword(req, res) {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ message: 'Email requerido' });

        await authService.startPasswordReset(email);
        // Siempre 200 para no revelar qué correos existen
        return res.json({ ok: true, message: 'Si el correo existe, se envió un enlace de recuperación.' });
    } catch (e) {
        console.error('[AUTH] forgotPassword error:', e.message);
        return res.status(500).json({ message: 'Error al iniciar recuperación' });
    }
}

async function resetPassword(req, res) {
    try {
        const { token, password } = req.body || {};
        if (!token || !password) return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });

        await authService.completePasswordReset(token, password);
        return res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
    } catch (e) {
        if (e.code === 'INVALID_TOKEN' || e.code === 'WEAK_PASSWORD') {
            return res.status(400).json({ message: e.message });
        }
        console.error('[AUTH] resetPassword error:', e.message);
        return res.status(500).json({ message: 'Error al restablecer contraseña' });
    }
}

module.exports = { login, register, logout, forgotPassword, resetPassword };
