import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerUsersTable = pgTable("customer_users", {
  id: serial("id").primaryKey(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  customerId: integer("customer_id").notNull(),
  referralCode: text("referral_code").unique(),
  referredByUserId: integer("referred_by_user_id"),
  email: text("email"),
  googleId: text("google_id"),
  authProvider: text("auth_provider").notNull().default("phone"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerUserSchema = createInsertSchema(customerUsersTable).omit({ id: true, createdAt: true });
export type InsertCustomerUser = z.infer<typeof insertCustomerUserSchema>;
export type CustomerUser = typeof customerUsersTable.$inferSelect;
