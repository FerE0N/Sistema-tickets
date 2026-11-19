// server/sse.js: avisos en tiempo real con Server-Sent Events.
// Un trigger de PostgreSQL emite NOTIFY ticket_changes en cada INSERT/UPDATE/DELETE
// de tickets; aquí se escucha ese canal y se reenvía a todos los navegadores conectados.
const express = require('express');
const { Client } = require('pg');
const { dbConfig } = require('../models/db');

const clients = new Set();
const router = express.Router();

router.get('/', (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 5000\n\n');

    clients.add(res);
    // Comentario periódico para que proxies no cierren la conexión
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(res);
    });
});

function broadcast(event, payload) {
    const data = `event: ${event}\ndata: ${payload}\n\n`;
    for (const res of clients) res.write(data);
}

let listener;
async function startTicketListener() {
    if (listener) return listener;
    listener = new Client(dbConfig);
    listener.on('notification', (msg) => {
        if (msg.channel === 'ticket_changes') broadcast('tickets:update', msg.payload || '{}');
    });
    listener.on('error', (err) => {
        console.error('[SSE] Conexión LISTEN perdida, reintentando en 5 s:', err.message);
        listener = null;
        setTimeout(() => startTicketListener().catch(() => {}), 5000);
    });
    await listener.connect();
    await listener.query('LISTEN ticket_changes');
    return listener;
}

module.exports = { router, broadcast, startTicketListener, clients };
