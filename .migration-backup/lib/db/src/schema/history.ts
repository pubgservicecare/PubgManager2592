import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const historyTable = pgTable("history", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHistorySchema = createInsertSchema(historyTable).omit({ id: true, createdAt: true });
export type InsertHistory = z.infer<typeof insertHistorySchema>;
export type HistoryEntry = typeof historyTable.$inferSelect;
