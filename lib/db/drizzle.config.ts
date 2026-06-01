import { defineConfig } from "drizzle-kit";
import path from "path";

/**
 * Connection priority mirrors lib/db/src/index.ts:
 * 1. NEON_DATABASE_URL  — external Neon (user-controlled)
 * 2. DATABASE_URL       — Replit-managed PostgreSQL
 *
 * This ensures `pnpm db push` / `pnpm db generate` target
 * Neon whenever it is configured.
 */
const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "No database URL found. Set NEON_DATABASE_URL or ensure DATABASE_URL is provisioned.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: { url },
});
