import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    customerUserId: integer("customer_user_id").notNull(),
    type: text("type", {
      enum: ["chat", "payment_due", "payment_received", "account_status", "wishlist", "system"],
    })
      .notNull()
      .default("system"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index("notifications_user_idx").on(t.customerUserId, t.read, t.createdAt),
  })
);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
