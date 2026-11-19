-- Datos de demostración. Todas las cuentas usan la contraseña: Demo1234!
-- Uso: psql -d sistema_tickets -f db/seed.sql   (después de schema.sql)

BEGIN;

INSERT INTO roles (role_id, name) VALUES
    (1, 'superadmin'), (2, 'admin'), (3, 'auxiliar')
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO departments (name) VALUES
    ('Sistemas'), ('Recursos Humanos'), ('Finanzas'), ('Operaciones'), ('Ventas')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name) VALUES
    ('Hardware'), ('Software'), ('Red e Internet'), ('Accesos y cuentas'), ('Impresoras'), ('Otro')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (name, last_name, email, password, role_id, department_id)
SELECT v.name, v.last_name, v.email, '$2b$10$OfqHswj5hgmZHWpLDqg10eXuNFmS1q/qjwZy4ElB80YYdFi3wuU..', v.role_id, d.department_id
FROM (VALUES
    ('Super',  'Admin',    'superadmin@demo.com', 1, 'Sistemas'),
    ('Ana',    'Torres',   'admin@demo.com',      2, 'Sistemas'),
    ('Luis',   'Ramírez',  'agente@demo.com',     3, 'Sistemas'),
    ('Sofía',  'Méndez',   'sofia@demo.com',      3, 'Sistemas'),
    ('Carlos', 'Herrera',  'carlos@demo.com',     3, 'Finanzas'),
    ('María',  'López',    'maria@demo.com',      3, 'Recursos Humanos'),
    ('Jorge',  'Castillo', 'jorge@demo.com',      3, 'Ventas')
) AS v(name, last_name, email, role_id, dept)
JOIN departments d ON d.name = v.dept
ON CONFLICT DO NOTHING;

-- 60 tickets repartidos en los últimos 30 días (solo si la tabla está vacía)
INSERT INTO tickets (subject, description, category_id, responsible_id, agent_id, status, created_at)
SELECT
    s.subject,
    'Ticket de demostración generado por seed.sql.',
    (SELECT category_id FROM categories ORDER BY category_id OFFSET (g % 6) LIMIT 1),
    (SELECT user_id FROM users WHERE email IN ('carlos@demo.com', 'maria@demo.com', 'jorge@demo.com')
        ORDER BY user_id OFFSET (g % 3) LIMIT 1),
    (SELECT user_id FROM users WHERE email IN ('agente@demo.com', 'sofia@demo.com', 'admin@demo.com')
        ORDER BY user_id OFFSET ((g / 2) % 3) LIMIT 1),
    (ARRAY['abierto', 'en progreso', 'cerrado', 'cerrado'])[1 + (g % 4)],
    NOW() - ((g % 30) || ' days')::interval - ((g * 37 % 600) || ' minutes')::interval
FROM generate_series(1, 60) AS g
CROSS JOIN LATERAL (
    SELECT (ARRAY[
        'La computadora no enciende', 'No puedo acceder al correo', 'Instalar paquetería de oficina',
        'Internet lento en el área', 'Restablecer contraseña del ERP', 'La impresora no imprime',
        'Solicitud de monitor adicional', 'Error al abrir el sistema de nómina', 'Configurar VPN',
        'Alta de usuario nuevo'
    ])[1 + (g % 10)] AS subject
) s
WHERE NOT EXISTS (SELECT 1 FROM tickets);

COMMIT;
