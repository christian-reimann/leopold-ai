ALTER TABLE "matches" DROP CONSTRAINT "matches_search_query_id_search_queries_id_fk";
--> statement-breakpoint
DROP INDEX "matches_job_search_query_idx";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "reasoning" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "reasoning" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
CREATE UNIQUE INDEX "matches_job_id_idx" ON "matches" USING btree ("job_id");--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "search_query_id";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "score_job_to_me";