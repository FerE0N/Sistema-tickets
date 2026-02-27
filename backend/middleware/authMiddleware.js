// backend/middleware/authMiddleware.js
const { verifyToken } = require('../services/authService');
const revokedSvc = require('../services/revokedTokenService');

const ROLES = { SUPERADMIN: 1, ADMIN: 2, AUX: 3 };
exports.ROLES = ROLES;

exports.authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return res.status(401).json({ message: 'Token requerido' });

        const payload = verifyToken(token); // { jti, id, role_id, name, iat, exp }
        // Logs de depuración (⚠️ desactiva en producción)
        console.log('[AUTH] payload:', {
            jti: payload?.jti,
            id: payload?.id,
            role_id: payload?.role_id,
            name: payload?.name,
            iat: payload?.iat,
            exp: payload?.exp
        });

        if (!payload?.jti) return res.status(401).json({ message: 'Token inválido' });

        const revoked = await revokedSvc.isRevoked(payload.jti);
        if (revoked) {
            console.warn('[AUTH] Token revocado detectado:', { jti: payload.jti, id: payload.id });
            return res.status(401).json({ message: 'Token revocado' });
        }

        req.user = { id: payload.id, role_id: payload.role_id, name: payload.name, jti: payload.jti };
        next();
    } catch (err) {
        console.error('[AUTH] authenticate error:', err?.message || err);
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

exports.requireRoles = (...allowed) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' });
    if (!allowed.includes(req.user.role_id)) {
        return res.status(403).json({ message: 'Sin permisos' });
    }
    next();
};

exports.requireSelfOrRoles = (getTargetUserId, ...allowed) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' });

    try {
        const targetId = Number(getTargetUserId(req));
        if (Number(req.user.id) === targetId) return next();
    } catch (_) { /* ignore */ }

    if (!allowed.includes(req.user.role_id)) {
        return res.status(403).json({ message: 'Sin permisos' });
    }
    next();
};
