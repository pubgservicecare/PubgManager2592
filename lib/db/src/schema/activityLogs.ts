import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  actorType: text("actor_type", { enum: ["admin", "seller", "customer", "system"] }).notNull(),
  actorName: text("actor_name").notNull(),
  actorId: integer("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
