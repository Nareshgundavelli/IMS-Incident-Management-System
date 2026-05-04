const { Pool } = require('pg');
const { env } = require('../config/env');
const pool = new Pool({ host: env.POSTGRES_HOST, port: env.POSTGRES_PORT, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, database: env.POSTGRES_DB, ssl: env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false });
module.exports = { pool };
