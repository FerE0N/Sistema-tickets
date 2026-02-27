// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const crypto = require('crypto');
const db = require('../models/db'); // tu pool/cliente PG
const nodemailer = require('nodemailer');

const RESET_TTL_MINUTES = 60; // 1 hora

// ---------- Email (usa SMTP si lo configuras) ----------
async function sendResetEmail(to, resetUrl) {
    // Si no configuras SMTP, lo registramos en consola
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST) {
        console.log(`[DEV] Enlace de reseteo para ${to}: ${resetUrl}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: false,
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

// ---------- Generar token (guardamos hash en DB) ----------
function generateTokenPair() {
    const raw = crypto.randomBytes(32).toString('hex');             // token que viaja por URL
    const hash = crypto.createHash('sha256').update(raw).digest('hex'); // lo que guardamos
    return { raw, hash };
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

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = '2h';

async function hashPassword(plain) {
    return await bcrypt.hash(String(plain), 10);
}

async function comparePassword(plain, hash) {
    // Si hash viniera null/undefined, evita crash y devuelve false
    if (!hash) return false;
    return await bcrypt.compare(String(plain), String(hash));
}

function generateToken(user) {
    const jti = randomUUID();
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
        return payload; // 👈 MUY IMPORTANTE
    } catch (e) {
        const err = new Error('Invalid token');
        err.code = 'INVALID_TOKEN';
        throw err;
    }
}

module.exports = {
    sendResetEmail,
    generateTokenPair,
    startPasswordReset,
    completePasswordReset,
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken
}