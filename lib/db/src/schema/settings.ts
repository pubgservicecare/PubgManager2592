import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  // Branding
  siteName: text("site_name").notNull().default("PUBG Account Manager"),
  siteDescription: text("site_description").notNull().default("Premium PUBG Mobile accounts marketplace"),
  heroTagline: text("hero_tagline").notNull().default("DOMINATE THE BATTLEGROUND"),
  footerText: text("footer_text").notNull().default("© PUBG Account Manager — All rights reserved."),
  logoUrl: text("logo_url"),
  // Contact
  supportEmail: text("support_email").notNull().default("support@example.com"),
  whatsappNumber: text("whatsapp_number").notNull().default("923000000000"),
  businessAddress: text("business_address"),
  // Marketplace rules
  allowSellerRegistration: boolean("allow_seller_registration").notNull().default(true),
  defaultSellerCommissionPercent: integer("default_seller_commission_percent").notNull().default(10),
  showSellerNamesPublicly: boolean("show_seller_names_publicly").notNull().default(true),
  // Promo banner (homepage announcement bar)
  bannerEnabled: boolean("banner_enabled").notNull().default(false),
  bannerText: text("banner_text"),
  // Popular searches shown beside marketplace search bar (comma-separated)
  popularSearches: text("popular_searches").notNull().default("Glacier,Mummy,AKM,Mythic,Conqueror,Car Skin,M24,Pharaoh"),
  // Payments info shown to buyers
  paymentMethodsInfo: text("payment_methods_info"),
  // Maintenance mode
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message").notNull().default("We're performing scheduled maintenance. Please check back soon."),
  // Social links
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  tiktokUrl: text("tiktok_url"),
  discordUrl: text("discord_url"),
  // Auth
  adminUsername: text("admin_username").notNull().default("admin"),
  adminPassword: text("admin_password").notNull().default("admin123"),
  // File Storage (configurable from Admin UI)
  storageProvider: text("storage_provider").notNull().default("local"),
  gcsBucketName: text("gcs_bucket_name"),
  gcsProjectId: text("gcs_project_id"),
  gcsServiceAccountEmail: text("gcs_service_account_email"),
  gcsPrivateKey: text("gcs_private_key"),
  gcsPublicBaseUrl: text("gcs_public_base_url"),
  gcsFolderPath: text("gcs_folder_path"),
  // Legacy GCS fields (kept for backward compat)
  gcsKeyJson: text("gcs_key_json"),
  gcsBucketPublicPath: text("gcs_bucket_public_path"),
  gcsBucketPrivatePath: text("gcs_bucket_private_path"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
