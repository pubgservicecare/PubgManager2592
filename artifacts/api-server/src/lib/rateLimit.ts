import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * DB-backed rate limiter using PostgreSQL.
 *
 * Benefits over the previous in-memory Map:
 *   - Persists across server restarts and deploys
 *   - Consistent across multiple Render instances
 *   - Atomic upsert prevents race-condition bypass
 *
 * Fails OPEN on DB errors (allows the request) to avoid blocking
 * legitimate users during a DB outage.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const windowSecs = Math.ceil(windowMs / 1000);
  try {
    const result = await pool.query<{ count: number; allowed: boolean }>(
      `INSERT INTO rate_limit_entries (key, count, reset_at)
       VALUES ($1, 1, NOW() + ($2 || ' seconds')::interval)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN rate_limit_entries.reset_at < NOW() THEN 1
           ELSE rate_limit_entries.count + 1
         END,
         reset_at = CASE
           WHEN rate_limit_entries.reset_at < NOW()
             THEN NOW() + ($2 || ' seconds')::interval
           ELSE rate_limit_entries.reset_at
         END
       RETURNING
         rate_limit_entries.count,
         (rate_limit_entries.count <= $3) AS allowed`,
      [key, String(windowSecs), maxRequests],
    );
    return result.rows[0]?.allowed ?? true;
  } catch (err) {
    logger.warn({ err, key }, "rate-limit: DB error, failing open");
    return true;
  }
}
