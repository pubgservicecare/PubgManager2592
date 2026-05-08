import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wishlistTable = pgTable(
  "wishlist",
  {
    id: serial("id").primaryKey(),
    customerUserId: integer("customer_user_id").notNull(),
    accountId: integer("account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqUserAccount: uniqueIndex("wishlist_user_account_uniq").on(t.customerUserId, t.accountId),
  })
);

export const insertWishlistSchema = createInsertSchema(wishlistTable).omit({ id: true, createdAt: true });
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Wishlist = typeof wishlistTable.$inferSelect;
