CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"review_type" text DEFAULT 'account' NOT NULL,
	"customer_user_id" integer NOT NULL,
	"customer_db_id" integer NOT NULL,
	"rating" smallint NOT NULL,
	"review_text" text,
	"approved" boolean DEFAULT false NOT NULL,
	"featured_on_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "site_name" SET DEFAULT 'CodexStocks';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "site_description" SET DEFAULT 'Browse verified PUBG Mobile accounts with mythic skins, X-Suits, Glacier weapons and rare items — secure transfers, transparent listings, and a buying experience built for trust.';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "hero_tagline" SET DEFAULT 'PUBG Mobile Account Marketplace';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "footer_text" SET DEFAULT '© CodexStocks — All rights reserved.';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "neon_database_url" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_slug_unique" UNIQUE("slug");