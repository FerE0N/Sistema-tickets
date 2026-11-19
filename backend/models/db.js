// models/db.js: pool de conexiones a PostgreSQL.
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const pool = new Pool(dbConfig);

module.exports = pool;
module.exports.dbConfig = dbConfig;
