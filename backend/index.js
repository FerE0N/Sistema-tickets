// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const departamentosRoutes = require('./routes/departamentos');
const usersRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets.js');
const categoriasRoutes = require('./routes/categorias.js');
const adminRoutes = require('./routes/admin.js');
const dashboardRoutes = require('./routes/dashboard.js');

const app = express();

/* ===== CORS robusto (con whitelist por .env) ===== */
const DEFAULT_ORIGINS = [
    'http://localhost:3000',
    'http://192.168.56.1:3000',
    'http://127.0.0.1:3000',
    'http://[::1]:3000'
];

// Permite definir más orígenes en .env como lista separada por comas
// CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.50:3000
const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...extra])];

app.use((req, res, next) => {
    console.log('[REQ]', req.method, req.url, 'Origin:', req.headers.origin || '(no-origin)');
    next();
});

app.use(cors({
    origin: (origin, cb) => {
        // peticiones tipo REST client / curl no mandan Origin -> permitir
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
}));

app.use(express.json());

// Manejo de JSON mal formado
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        console.error('[JSON PARSE ERROR] url:', req.url, 'message:', err.message);
        return res.status(400).json({ message: 'JSON mal formado', detail: err.message });
    }
    next(err);
});

/* ===== Rutas ===== */
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
    console.log('CORS allowed origins:', allowedOrigins);
});
