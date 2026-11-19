// index.js: punto de entrada del servidor.
require('dotenv').config({ quiet: true });

const app = require('./app');
const sse = require('./server/sse');
const revokedSvc = require('./services/revokedTokenService');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
});

// Escucha NOTIFY ticket_changes de PostgreSQL y lo reenvía por SSE.
sse.startTicketListener().catch((err) => {
    console.error('[SSE] No se pudo iniciar LISTEN ticket_changes:', err.message);
});

// Limpia cada hora los tokens revocados que ya expiraron.
const cleanup = () => revokedSvc.cleanupExpired().catch((e) => console.error('[CLEANUP]', e.message));
cleanup();
setInterval(cleanup, 60 * 60 * 1000).unref();
