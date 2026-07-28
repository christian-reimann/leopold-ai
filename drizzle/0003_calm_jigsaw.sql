ALTER TABLE "documents" ADD COLUMN "embedding_status" "document_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "embedding_error" text;