import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  accountId: text("account_id").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
  priceForSale: numeric("price_for_sale", { precision: 12, scale: 2 }).notNull(),
  finalSoldPrice: numeric("final_sold_price", { precision: 12, scale: 2 }),
  purchaseDate: text("purchase_date"),
  previousOwnerContact: text("previous_owner_contact"),
  videoUrl: text("video_url"),
  imageUrls: text("image_urls").array(),
  description: text("description"),
  status: text("status", {
    enum: ["active", "reserved", "under_review", "hidden", "sold", "installment"],
  }).notNull().default("active"),
  visibility: text("visibility", { enum: ["public", "private"] }).notNull().default("public"),
  sellerId: integer("seller_id"),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),
  customerContact: text("customer_contact"),
  isFeatured: integer("is_featured").notNull().default(0),
  featuredOrder: integer("featured_order"),
  viewCount: integer("view_count").notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
