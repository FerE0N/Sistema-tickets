// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../models/db');
const nodemailer = require('nodemailer');

const RESET_TTL_MINUTES = 60; // 1 hora
const MIN_PASSWORD_LENGTH = 8;

// ---------- Email (usa SMTP si lo configuras) ----------
async function sendResetEmail(to, resetUrl) {
    // Si no configuras SMTP, lo registramos en consola
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST) {
        // Sin SMTP (desarrollo): el enlace solo se muestra en la consola del servidor
        console.log(`[DEV] Enlace de recuperación para ${to}: ${resetUrl}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });

    await transporter.sendMail({
        from: SMTP_FROM || '"Tickets" <no-reply@tickets.local>',
        to,
        subject: 'Restablecer contraseña',
        html: `
      <p>Solicitaste restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace (válido por ${RESET_TTL_MINUTES} min):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si no fuiste tú, ignora este correo.</p>
    `,
    });
}

// ---------- Public API ----------
async function startPasswordReset(email) {
    const lower = String(email || '').trim().toLowerCase();

    const { rows } = await db.query(
        `SELECT user_id AS id, email
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
        [lower]
    );

    if (rows.length === 0) {
        // evitar user enumeration
        return;
    }

    const user = rows[0];
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await db.query(
        `UPDATE users
            SET reset_token = $1,
                reset_expires = $2
        WHERE user_id = $3`,
        [hash, expires, user.id]
    );

    // URL que abrirá el front
    const base = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${base}/reset-password?token=${raw}`;
    await sendResetEmail(user.email, resetUrl);
};

async function completePasswordReset(rawToken, newPassword) {
    const hash = crypto.createHash('sha256').update(String(rawToken)).digest('hex');

    const { rows } = await db.query(
        `SELECT user_id AS id, reset_expires
        FROM users
        WHERE reset_token = $1
        LIMIT 1`,
        [hash]
    );

    if (rows.length === 0) {
        const err = new Error('Token inválido o expirado'); err.code = 'INVALID_TOKEN'; throw err;
    }

    if (String(newPassword || '').length < MIN_PASSWORD_LENGTH) {
        const err = new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
        err.code = 'WEAK_PASSWORD'; throw err;
    }

    const user = rows[0];
    if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
        const err = new Error('Token inválido o expirado'); err.code = 'INVALID_TOKEN'; throw err;
    }

    const hashPwd = await bcrypt.hash(String(newPassword), 10);

    await db.query(
        `UPDATE users
            SET password = $1,
                reset_token = NULL,
                reset_expires = NULL
        WHERE user_id = $2`,
        [hashPwd, user.id]
    );
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }
    // En desarrollo y pruebas se genera uno aleatorio por arranque (las sesiones no sobreviven reinicios)
    console.warn('[AUTH] JWT_SECRET ausente o corto: usando un secreto temporal aleatorio');
    return crypto.randomBytes(32).toString('hex');
})();

async function hashPassword(plain) {
    return await bcrypt.hash(String(plain), 10);
}

async function comparePassword(plain, hash) {
    // Si hash viniera null/undefined, evita crash y devuelve false
    if (!hash) return false;
    return await bcrypt.compare(String(plain), String(hash));
}

function generateToken(user) {
    const jti = crypto.randomUUID();
    const payload = {
        jti,
        id: user.user_id,
        role_id: user.role_id,
        name: user.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // calcular expiresAt (fecha/hora) a partir del token
    const decoded = jwt.decode(token); // { exp, iat, ... }
    const expiresAt = new Date(decoded.exp * 1000);

    return { token, jti, expiresAt };
};

function sanitizeBearer(token) {
    return String(token || '').replace(/^Bearer\s+/i, '').trim();
}

function verifyToken(token) {
    try {
        const raw = sanitizeBearer(token);
        const payload = jwt.verify(raw, JWT_SECRET);
        return payload;
    } catch (e) {
        const err = new Error('Invalid token');
        err.code = 'INVALID_TOKEN';
        throw err;
    }
}

module.exports = {
    MIN_PASSWORD_LENGTH,
    sendResetEmail,
    startPasswordReset,
    completePasswordReset,
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken
}