ALTER TABLE "job_postings" DROP CONSTRAINT "job_postings_dedupe_hash_unique";--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "source_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "duplicate_of_id" uuid;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_duplicate_of_id_job_postings_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_postings_dedupe_hash_idx" ON "job_postings" USING btree ("dedupe_hash");--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_source_unique" UNIQUE("source_connector","source_id");