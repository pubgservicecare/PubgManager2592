import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sellersTable = pgTable("sellers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp"),
  passwordHash: text("password_hash").notNull(),
  cnicNumber: text("cnic_number").notNull(),
  cnicFrontUrl: text("cnic_front_url").notNull(),
  cnicBackUrl: text("cnic_back_url").notNull(),
  selfieUrl: text("selfie_url").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "suspended"],
  })
    .notNull()
    .default("pending"),
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  totalListings: integer("total_listings").notNull().default(0),
  totalSold: integer("total_sold").notNull().default(0),
  totalEarnings: text("total_earnings").default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSellerSchema = createInsertSchema(sellersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
  totalListings: true,
  totalSold: true,
  totalEarnings: true,
});
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Seller = typeof sellersTable.$inferSelect;
