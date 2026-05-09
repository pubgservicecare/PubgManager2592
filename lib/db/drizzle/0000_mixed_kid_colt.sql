CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"account_id" text NOT NULL,
	"purchase_price" numeric(12, 2),
	"price_for_sale" numeric(12, 2) NOT NULL,
	"final_sold_price" numeric(12, 2),
	"purchase_date" text,
	"previous_owner_contact" text,
	"video_url" text,
	"image_urls" text[],
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"seller_id" integer,
	"customer_id" integer,
	"customer_name" text,
	"customer_contact" text,
	"is_featured" integer DEFAULT 0 NOT NULL,
	"featured_order" integer,
	"view_count" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"type" text NOT NULL,
	"login" text DEFAULT '' NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"note" text,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"receipt_number" text,
	"is_reversal" boolean DEFAULT false NOT NULL,
	"reverses_payment_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"customer_id" integer NOT NULL,
	"referral_code" text,
	"referred_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "customer_users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "history" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"sender" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"account_id" integer,
	"guest_name" text,
	"seller_id" integer,
	"last_message" text,
	"last_message_at" timestamp with time zone,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"customer_unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text DEFAULT 'PUBG Account Manager' NOT NULL,
	"site_description" text DEFAULT 'Premium PUBG Mobile accounts marketplace' NOT NULL,
	"hero_tagline" text DEFAULT 'DOMINATE THE BATTLEGROUND' NOT NULL,
	"footer_text" text DEFAULT '© PUBG Account Manager — All rights reserved.' NOT NULL,
	"logo_url" text,
	"support_email" text DEFAULT 'support@example.com' NOT NULL,
	"whatsapp_number" text DEFAULT '923000000000' NOT NULL,
	"business_address" text,
	"allow_seller_registration" boolean DEFAULT true NOT NULL,
	"default_seller_commission_percent" integer DEFAULT 10 NOT NULL,
	"show_seller_names_publicly" boolean DEFAULT true NOT NULL,
	"banner_enabled" boolean DEFAULT false NOT NULL,
	"banner_text" text,
	"popular_searches" text DEFAULT 'Glacier,Mummy,AKM,Mythic,Conqueror,Car Skin,M24,Pharaoh' NOT NULL,
	"payment_methods_info" text,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"maintenance_message" text DEFAULT 'We''re performing scheduled maintenance. Please check back soon.' NOT NULL,
	"facebook_url" text,
	"instagram_url" text,
	"youtube_url" text,
	"tiktok_url" text,
	"discord_url" text,
	"admin_username" text NOT NULL,
	"admin_password" text NOT NULL,
	"storage_provider" text DEFAULT 'local' NOT NULL,
	"gcs_bucket_name" text,
	"gcs_project_id" text,
	"gcs_service_account_email" text,
	"gcs_private_key" text,
	"gcs_public_base_url" text,
	"gcs_folder_path" text,
	"gcs_key_json" text,
	"gcs_bucket_public_path" text,
	"gcs_bucket_private_path" text
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text,
	"password_hash" text NOT NULL,
	"cnic_number" text NOT NULL,
	"cnic_front_url" text NOT NULL,
	"cnic_back_url" text NOT NULL,
	"selfie_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"total_listings" integer DEFAULT 0 NOT NULL,
	"total_sold" integer DEFAULT 0 NOT NULL,
	"total_earnings" text DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sellers_username_unique" UNIQUE("username"),
	CONSTRAINT "sellers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_id" integer,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" integer,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_user_id" integer NOT NULL,
	"type" text DEFAULT 'system' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_user_account_uniq" ON "wishlist" USING btree ("customer_user_id","account_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("customer_user_id","read","created_at");