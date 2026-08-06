ALTER TABLE "applications" DROP COLUMN "pdf_status";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "pdf_error";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "cv_pdf_path";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "letter_pdf_path";--> statement-breakpoint
DROP TYPE "public"."application_pdf_status";