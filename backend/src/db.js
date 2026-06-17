// ═══════════════════════════════════════════════════════════
//  DATABASE POOL — PostgreSQL via `pg`
//  Uses a connection pool to efficiently handle concurrent
//  requests. All queries are isolated per user_id via WHERE.
// ═══════════════════════════════════════════════════════════
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // For SSL-required cloud providers (Neon, Supabase, Railway):
  // ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

module.exports = pool;
