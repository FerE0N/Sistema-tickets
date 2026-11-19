// app.js: crea y configura la app de Express (sin abrir el puerto, para poder probarla).
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const departamentosRoutes = require('./routes/departamentos');
const usersRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const categoriasRoutes = require('./routes/categorias');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const sse = require('./server/sse');

const app = express();

/* ===== CORS con lista blanca (CORS_ORIGINS en .env, separada por comas) ===== */
const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...extra])];

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
    origin: (origin, cb) => {
        // Clientes sin Origin (curl, REST Client, k6) se permiten
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
        console.log('[REQ]', req.method, req.originalUrl);
        next();
    });
}

/* ===== Rutas ===== */
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/events', sse.router);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

/* ===== Manejo central de errores ===== */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON mal formado' });
    }
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error('[ERROR]', err);
    res.status(status).json({ message: status >= 500 ? 'Error interno' : err.message });
});

module.exports = app;
