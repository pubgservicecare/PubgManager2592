import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * Connection priority:
 * 1. NEON_DATABASE_URL  — external Neon database (user-controlled)
 * 2. DATABASE_URL       — Replit-managed PostgreSQL (auto-injected, locked)
 *
 * Replit locks DATABASE_URL and prevents overriding it. By reading
 * NEON_DATABASE_URL first we can seamlessly switch to Neon without
 * touching Replit's managed variable.
 *
 * SSL is enabled automatically for Neon connections.
 */
const usingNeon = !!process.env.NEON_DATABASE_URL;
const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string found. " +
      "Set NEON_DATABASE_URL for an external Neon database, " +
      "or ensure DATABASE_URL is provisioned by Replit.",
  );
}

export const pool = new Pool({
  connectionString,
  // Neon requires SSL; Replit's internal DATABASE_URL handles it itself.
  ssl: usingNeon ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";

/**
 * Tests an arbitrary PostgreSQL connection string without affecting the
 * live pool. Used by the admin settings "Test Neon Connection" endpoint.
 * SSL is always enabled (required by Neon and harmless elsewhere).
 */
export async function testDatabaseUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  const testPool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 1000,
  });
  try {
    const client = await testPool.connect();
    try {
      await client.query("SELECT 1");
      return { ok: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Connection failed." };
  } finally {
    await testPool.end().catch(() => {});
  }
}
