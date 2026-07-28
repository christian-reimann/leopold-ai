CREATE TYPE "public"."profile_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "status" "profile_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "error" text;