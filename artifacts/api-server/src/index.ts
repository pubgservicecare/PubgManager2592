import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { backfillSlugs } from "./lib/slugify";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    ) WITH (OIDS=FALSE);
    CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limit_entries (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      customer_user_id INTEGER,
      ip TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_action ON auth_audit_logs (action);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user ON auth_audit_logs (customer_user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created ON auth_audit_logs (created_at DESC);
  `);

  await pool.query(`
    ALTER TABLE customer_users
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  `);
}

function startCleanupJob() {
  const runCleanup = async () => {
    try {
      const [ev, prt, rl] = await Promise.all([
        pool.query(`
          DELETE FROM email_verifications
          WHERE expires_at < NOW() - INTERVAL '2 hours'
        `),
        pool.query(`
          DELETE FROM password_reset_tokens
          WHERE expires_at < NOW() - INTERVAL '2 hours'
        `),
        pool.query(`
          DELETE FROM rate_limit_entries
          WHERE reset_at < NOW()
        `),
      ]);
      logger.info(
        {
          emailVerificationsDeleted: ev.rowCount,
          passwordResetTokensDeleted: prt.rowCount,
          rateLimitEntriesDeleted: rl.rowCount,
        },
        "cleanup: expired records purged",
      );
    } catch (err) {
      logger.error({ err }, "cleanup: job failed");
    }
  };

  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000);
}

async function start() {
  await initTables();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");

    backfillSlugs().catch((err) => {
      logger.warn({ err }, "Slug backfill failed — will retry on next restart");
    });

    startCleanupJob();
  });
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
