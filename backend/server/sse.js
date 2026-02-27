// src/server/sse.js (o dentro de index.js)
const { Pool } = require('pg');
const pool = require('./models/db'); // tu pool existente
let pgClient;

// SSE endpoint
app.get('/api/events', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`event: ping\ndata: ok\n\n`); // warm up

    // Únete al canal de Postgres una sola vez
    if (!pgClient) {
        pgClient = await pool.connect();
        await pgClient.query('LISTEN ticket_changes');
        pgClient.on('notification', (msg) => {
            // Reenvía a todos los clientes conectados
            const data = `event: ticket\ndata: ${msg.payload}\n\n`;
            clients.forEach(c => c.write(data));
        });
    }

    // registra cliente
    clients.add(res);
    req.on('close', () => { clients.delete(res); });
});
const clients = new Set();
