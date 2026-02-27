// services/revokedTokenService.js
const pool = require('../models/db.js');

async function revoke({ jti, user_id, expires_at }) {
    console.log(`[LOGOUT] Revocando token`, { jti, user_id, expires_at: expires_at.toISOString() });
    const { rowCount } = await pool.query(`
    INSERT INTO revokedtokens (jti, user_id, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (jti) DO NOTHING
  `, [jti, user_id, expires_at]);
    console.log(`[LOGOUT] Revocación ${rowCount ? 'INSERTADA' : 'YA EXISTÍA'} para jti=${jti}`);
    return rowCount > 0;
};

async function isRevoked(jti) {
    const { rows } = await pool.query(
        `SELECT 1 FROM revokedtokens WHERE jti = $1 LIMIT 1`,
        [jti]
    );
    return rows.length > 0;
};

async function cleanupExpired() {
    const { rowCount } = await pool.query(`DELETE FROM revokedtokens WHERE expires_at < NOW()`);
    if (rowCount) console.log(`[LOGOUT] Limpieza: ${rowCount} tokens expirados removidos`);
};

// Agregamos listPaged con filtros y orden.
async function listPaged({ page = 1, pageSize = 10, orderBy = 'revoked_at', orderDir = 'DESC' }) {
    const validOrderBy = new Set(['revoked_at', 'expires_at', 'user_id', 'jti']);
    const validOrderDir = new Set(['ASC', 'DESC']);

    const ob = validOrderBy.has(orderBy) ? orderBy : 'revoked_at';
    const od = validOrderDir.has(orderDir?.toUpperCase()) ? orderDir.toUpperCase() : 'DESC';

    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const dataQuery = `
    SELECT rt.jti, rt.user_id, u.name AS user_name, u.email AS user_email,
           rt.revoked_at, rt.expires_at
    FROM revokedtokens rt
    LEFT JOIN users u ON u.user_id = rt.user_id
    ORDER BY ${ob} ${od}
    LIMIT $1 OFFSET $2
  `;
    const countQuery = `SELECT COUNT(*)::int AS total FROM revokedtokens`;

    const [dataRes, countRes] = await Promise.all([
        pool.query(dataQuery, [limit, offset]),
        pool.query(countQuery)
    ]);

    const total = countRes.rows[0].total;
    return {
        page: Number(page),
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
        items: dataRes.rows
    };
};

module.exports = {
    revoke,
    isRevoked,
    cleanupExpired,
    listPaged
}