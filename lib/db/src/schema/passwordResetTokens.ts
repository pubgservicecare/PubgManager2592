import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { customerUsersTable } from "./customerUsers";

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  customerUserId: integer("customer_user_id").notNull().references(() => customerUsersTable.id),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
