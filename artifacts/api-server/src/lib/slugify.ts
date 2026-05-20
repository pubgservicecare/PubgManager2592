import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db/schema";
import { eq, isNull } from "drizzle-orm";
import { logger } from "./logger";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export async function generateUniqueSlug(
  title: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(title) || `account-${Date.now()}`;
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.slug, candidate));

    const conflict = existing.find((r) => r.id !== excludeId);
    if (!conflict) return candidate;

    candidate = `${base}-${counter}`;
    counter++;
  }
}

export async function backfillSlugs(): Promise<void> {
  const accounts = await db
    .select({ id: accountsTable.id, title: accountsTable.title })
    .from(accountsTable)
    .where(isNull(accountsTable.slug));

  if (accounts.length === 0) return;

  for (const acc of accounts) {
    try {
      const slug = await generateUniqueSlug(acc.title, acc.id);
      await db
        .update(accountsTable)
        .set({ slug })
        .where(eq(accountsTable.id, acc.id));
    } catch (err) {
      logger.warn({ err, accountId: acc.id }, "Failed to backfill slug for account");
    }
  }

  logger.info({ count: accounts.length }, "Backfilled account slugs");
}
