ALTER TABLE "documents" ADD COLUMN "original_filename" text;--> statement-breakpoint
UPDATE "documents" SET "original_filename" = regexp_replace(storage_path, '^.*/[0-9a-f-]{36}-', '');--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "original_filename" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "source";--> statement-breakpoint
DROP TYPE "public"."profile_source";