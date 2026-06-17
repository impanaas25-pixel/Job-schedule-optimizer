// ═══════════════════════════════════════════════════════════
//  DATABASE MIGRATION — One-time Schema Setup
//  Run with: npm run db:migrate
//  Creates all tables if they do not yet exist (idempotent).
// ═══════════════════════════════════════════════════════════
require("dotenv").config();
const pool = require("./db");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("🔄  Running StudioYield schema migration...");

    await client.query("BEGIN");

    // ── users ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── projects ─────────────────────────────────────────────
    // Each project belongs to one user (foreign key isolation).
    // status: 'Pending' | 'Scheduled' | 'Waitlisted'
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name           TEXT NOT NULL,
        deadline_day   INTEGER NOT NULL CHECK (deadline_day >= 1 AND deadline_day <= 20),
        contract_value INTEGER NOT NULL CHECK (contract_value >= 0),
        status         TEXT NOT NULL DEFAULT 'Pending'
                         CHECK (status IN ('Pending', 'Scheduled', 'Waitlisted')),
        scheduled_day  INTEGER,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── schedule_history ──────────────────────────────────────
    // Committed (locked) weekly optimization runs for analytics.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_history (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_capacity    INTEGER NOT NULL,
        total_value      INTEGER NOT NULL,
        total_weight     INTEGER NOT NULL,
        schedule_density NUMERIC(5,2) NOT NULL,
        accepted_json    JSONB NOT NULL DEFAULT '[]',
        rejected_json    JSONB NOT NULL DEFAULT '[]',
        blocked_day      INTEGER,
        committed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── Indexes for performance ────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id
        ON projects(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_history_user_id
        ON schedule_history(user_id);
    `);

    await client.query("COMMIT");
    console.log("✅  Migration complete. Tables ready:");
    console.log("    • users");
    console.log("    • projects");
    console.log("    • schedule_history");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
