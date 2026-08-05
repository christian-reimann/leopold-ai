ALTER TABLE "conversations" DROP CONSTRAINT "conversations_application_id_unique";--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "application_id";