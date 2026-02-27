// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/authController.js');
const { authenticate } = require('../middleware/authMiddleware.js');
const revokedSvc = require('../services/revokedTokenService.js');
const jwt = require('jsonwebtoken');
const { sendResetEmail } = require('../services/emailService'); // o similar


router.post('/login', c.login);
router.post('/register', c.register);

// /auth/me para depurar token
router.get('/me', authenticate, (req, res) => {
    console.log('[AUTH] /me user:', req.user);
    res.json({ user: req.user });
});

// Logout con trazas detalladas
router.post('/logout', authenticate, async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        // Decodifica sin verificar (ya se verificó en authenticate)
        const decoded = jwt.decode(token); // { jti, exp, id, role_id, name, ... }
        if (!decoded?.jti || !decoded?.exp) {
            console.warn('[LOGOUT] Token sin jti o exp - no se puede revocar:', decoded);
            return res.status(400).json({ message: 'Token inválido para logout' });
        }

        const expiresAt = new Date(decoded.exp * 1000);
        console.log('[LOGOUT] Solicitud de logout:', {
            user_id: req.user?.id,
            user_name: req.user?.name,
            role_id: req.user?.role_id,
            jti: decoded.jti,
            exp_unix: decoded.exp,
            exp_iso: expiresAt.toISOString()
        });

        const inserted = await revokedSvc.revoke({
            jti: decoded.jti,
            user_id: req.user.id,
            expires_at: expiresAt
        });

        console.log(`[LOGOUT] Resultado: ${inserted ? 'revocado' : 'ya estaba revocado'}`, { jti: decoded.jti });

        return res.json({
            message: 'Logout OK. Token revocado.',
            jti: decoded.jti,
            expires_at: expiresAt.toISOString()
        });
    } catch (err) {
        console.error('[LOGOUT] Error al revocar token:', err);
        return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
});

// ✅ solicitar enlace de reseteo
router.post('/forgot-password', c.forgotPassword);

// ✅ completar reseteo con token
router.post('/reset-password', c.resetPassword);

module.exports = router;
