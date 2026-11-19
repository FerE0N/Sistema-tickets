// Pruebas de integración del API contra una base PostgreSQL real.
// Requiere la base con db/schema.sql y db/seed.sql cargados: npm test
process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true });

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../app');
const pool = require('../../models/db');

const PASSWORD = 'Demo1234!';
const tokens = {};
const ids = {};

async function login(email) {
    const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    assert.equal(res.status, 200, `login ${email}: ${res.body.message}`);
    return res.body;
}
const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

before(async () => {
    for (const [who, email] of [
        ['superadmin', 'superadmin@demo.com'],
        ['admin', 'admin@demo.com'],
        ['agent', 'agente@demo.com'],
        ['carlos', 'carlos@demo.com'],
    ]) {
        const body = await login(email);
        tokens[who] = body.token;
        ids[who] = body.user.id;
    }
});

after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE 'test-%@demo.com'");
    await pool.end();
});

describe('autenticación', () => {
    test('rechaza credenciales inválidas con un mensaje genérico', async () => {
        const wrongPass = await request(app).post('/api/auth/login').send({ email: 'admin@demo.com', password: 'x' });
        const noUser = await request(app).post('/api/auth/login').send({ email: 'nadie@demo.com', password: 'x' });
        assert.equal(wrongPass.status, 401);
        assert.equal(noUser.status, 401);
        assert.equal(wrongPass.body.message, noUser.body.message);
    });

    test('las rutas protegidas exigen token', async () => {
        const res = await request(app).get('/api/tickets/paged');
        assert.equal(res.status, 401);
    });

    test('logout revoca el token', async () => {
        const { token } = await login('sofia@demo.com');
        const out = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
        assert.equal(out.status, 200);
        const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        assert.equal(me.status, 401);
    });

    test('el registro crea un auxiliar con la contraseña cifrada', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Prueba', last_name: 'Registro', email: 'test-register@demo.com', password: PASSWORD, role_id: 1,
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.user.role_id, 3);
        const { rows } = await pool.query("SELECT password FROM users WHERE email = 'test-register@demo.com'");
        assert.match(rows[0].password, /^\$2[aby]\$/);
    });
});

describe('tickets', () => {
    test('un auxiliar solo ve tickets donde es agente o responsable', async () => {
        const res = await request(app).get('/api/tickets/paged?pageSize=100').set(auth('carlos'));
        assert.equal(res.status, 200);
        assert.ok(res.body.items.length > 0);
        for (const t of res.body.items) {
            assert.ok(t.agent_id === ids.carlos || t.responsible_id === ids.carlos);
        }
    });

    test('un auxiliar no puede leer un ticket ajeno por id', async () => {
        const { rows } = await pool.query(
            'SELECT ticket_id FROM tickets WHERE agent_id <> $1 AND responsible_id <> $1 LIMIT 1', [ids.carlos]
        );
        const res = await request(app).get(`/api/tickets/${rows[0].ticket_id}`).set(auth('carlos'));
        assert.equal(res.status, 404);
    });

    test('el admin ve todos los tickets y puede filtrar por estado', async () => {
        const all = await request(app).get('/api/tickets/paged?pageSize=100').set(auth('admin'));
        const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM tickets');
        assert.equal(all.body.total, rows[0].n);

        const closed = await request(app).get('/api/tickets/paged?status=cerrado&pageSize=100').set(auth('admin'));
        assert.ok(closed.body.items.every((t) => t.status === 'cerrado'));
    });

    test('el parámetro sort no permite inyección SQL', async () => {
        const evil = encodeURIComponent('t.created_at; DROP TABLE tickets; --');
        const res = await request(app).get(`/api/tickets/paged?sort=${evil}`).set(auth('admin'));
        assert.equal(res.status, 200);
        const { rows } = await pool.query("SELECT to_regclass('public.tickets') AS t");
        assert.equal(rows[0].t, 'tickets');
    });

    test('crear, actualizar y borrar un ticket', async () => {
        const { rows: [cat] } = await pool.query('SELECT category_id FROM categories LIMIT 1');
        const created = await request(app).post('/api/tickets').set(auth('carlos')).send({
            subject: 'Prueba automática', category_id: cat.category_id, agent_id: ids.agent, responsible_id: ids.admin,
        });
        assert.equal(created.status, 201);
        assert.equal(created.body.responsible_id, ids.carlos, 'el auxiliar queda como responsable');

        const id = created.body.ticket_id;
        const denied = await request(app).put(`/api/tickets/${id}`).set(auth('carlos')).send({ status: 'cerrado' });
        assert.equal(denied.status, 403, 'solo el agente asignado puede cerrarlo');

        const bad = await request(app).put(`/api/tickets/${id}`).set(auth('agent')).send({ status: 'inventado' });
        assert.equal(bad.status, 400);

        const closed = await request(app).put(`/api/tickets/${id}`).set(auth('agent')).send({ status: 'cerrado' });
        assert.equal(closed.status, 200);
        assert.equal(closed.body.status, 'cerrado');

        const del = await request(app).delete(`/api/tickets/${id}`).set(auth('admin'));
        assert.equal(del.status, 200);
    });
});

describe('usuarios y roles', () => {
    test('un auxiliar no puede subirse de rol', async () => {
        const res = await request(app).put(`/api/users/${ids.carlos}`).set(auth('carlos')).send({ role_id: 1 });
        assert.ok([200, 404].includes(res.status));
        const { rows } = await pool.query('SELECT role_id FROM users WHERE user_id = $1', [ids.carlos]);
        assert.equal(rows[0].role_id, 3);
    });

    test('un admin no puede crear superadmins', async () => {
        const res = await request(app).post('/api/users').set(auth('admin')).send({
            name: 'X', last_name: 'Y', email: 'test-super@demo.com', password: PASSWORD, role_id: 1,
        });
        assert.equal(res.status, 403);
    });

    test('los usuarios creados por un admin guardan la contraseña cifrada', async () => {
        const res = await request(app).post('/api/users').set(auth('admin')).send({
            name: 'Nuevo', last_name: 'Usuario', email: 'test-created@demo.com', password: PASSWORD, role_id: 3,
        });
        assert.equal(res.status, 201);
        const { rows } = await pool.query("SELECT password FROM users WHERE email = 'test-created@demo.com'");
        assert.match(rows[0].password, /^\$2[aby]\$/);
        const again = await request(app).post('/api/auth/login').send({ email: 'test-created@demo.com', password: PASSWORD });
        assert.equal(again.status, 200);
    });
});

describe('dashboard', () => {
    test('scope=all es solo para administradores', async () => {
        const aux = await request(app).get('/api/dashboard/summary?scope=all').set(auth('carlos'));
        assert.equal(aux.status, 403);
        const adm = await request(app).get('/api/dashboard/summary?scope=all').set(auth('admin'));
        assert.equal(adm.status, 200);
        assert.equal(typeof adm.body.total, 'number');
    });
});
