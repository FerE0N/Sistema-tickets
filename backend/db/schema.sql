-- Esquema de la base de datos del Sistema de Tickets (PostgreSQL 14+)
-- Uso: psql -d sistema_tickets -f db/schema.sql

SET client_min_messages = warning;

BEGIN;

CREATE TABLE IF NOT EXISTS roles (
    role_id     SMALLINT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password      VARCHAR(100) NOT NULL,             -- hash bcrypt
    role_id       SMALLINT NOT NULL DEFAULT 3 REFERENCES roles(role_id),
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    reset_token   CHAR(64),                          -- hash SHA-256 del token de recuperación
    reset_expires TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id      SERIAL PRIMARY KEY,
    subject        VARCHAR(200) NOT NULL,
    description    TEXT,
    category_id    INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    responsible_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,  -- quien reporta
    agent_id       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,  -- quien atiende
    status         VARCHAR(20) NOT NULL DEFAULT 'abierto'
                   CHECK (status IN ('abierto', 'en progreso', 'cerrado')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tickets_agent_idx       ON tickets (agent_id);
CREATE INDEX IF NOT EXISTS tickets_responsible_idx ON tickets (responsible_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx      ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_created_idx     ON tickets (created_at DESC);

-- Tokens JWT revocados al cerrar sesión (lista negra por jti)
CREATE TABLE IF NOT EXISTS revokedtokens (
    jti        UUID PRIMARY KEY,
    user_id    INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS revokedtokens_expires_idx ON revokedtokens (expires_at);

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['departments', 'users', 'categories', 'tickets'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I
                        FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
    END LOOP;
END $$;

-- Aviso en tiempo real: cada cambio en tickets emite NOTIFY ticket_changes,
-- que el backend reenvía a los navegadores por Server-Sent Events.
CREATE OR REPLACE FUNCTION notify_ticket_change() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'ticket_changes',
        json_build_object(
            'op', TG_OP,
            'ticket_id', COALESCE(NEW.ticket_id, OLD.ticket_id)
        )::text
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_notify ON tickets;
CREATE TRIGGER tickets_notify AFTER INSERT OR UPDATE OR DELETE ON tickets
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_change();

COMMIT;
