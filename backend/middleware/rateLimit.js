// middleware/rateLimit.js: límites contra fuerza bruta en endpoints de autenticación.
const { rateLimit } = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isTest ? 1000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});
