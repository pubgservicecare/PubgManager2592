import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountLinksTable = pgTable("account_links", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  type: text("type", { enum: ["twitter", "google", "facebook", "game_center", "apple", "tiktok", "whatsapp", "number", "mail"] }).notNull(),
  login: text("login").notNull().default(""),
  password: text("password").notNull().default(""),
  value: text("value").notNull().default(""),
  status: text("status", { enum: ["old_owner", "my_controlled", "transferred"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLinkSchema = createInsertSchema(accountLinksTable).omit({ id: true, createdAt: true });
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type AccountLink = typeof accountLinksTable.$inferSelect;
