import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  target: text("target", { enum: ["all", "buyers", "custom"] }).notNull().default("all"),
  status: text("status", { enum: ["draft", "sent"] }).notNull().default("draft"),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaignsTable).omit({
  id: true,
  createdAt: true,
  sentCount: true,
  failedCount: true,
  sentAt: true,
});
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaignsTable.$inferSelect;
