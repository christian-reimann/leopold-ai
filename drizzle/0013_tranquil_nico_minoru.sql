-- Step 1: create columns as nullable initially
ALTER TABLE "profiles" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "search_queries" ADD COLUMN "profile_id" uuid;--> statement-breakpoint

-- Step 2: create fallback profile if none has ever existed
INSERT INTO "profiles" ("id", "name", "status")
SELECT gen_random_uuid(), 'Standardprofil', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM "profiles");--> statement-breakpoint

-- Step 3: populate names for existing profiles without a name
UPDATE "profiles" SET "name" = 'Standardprofil' WHERE "name" IS NULL;--> statement-breakpoint

-- Step 4: remove duplicates in conversations (enforce the singleton invariant before UNIQUE(profile_id) takes effect)
DELETE FROM "conversations" c
USING (
  SELECT "id", row_number() OVER (ORDER BY "created_at") AS rn FROM "conversations"
) ranked
WHERE c."id" = ranked."id" AND ranked.rn > 1;--> statement-breakpoint

-- Step 5: populate existing rows with the oldest profile
UPDATE "applications" SET "profile_id" = (SELECT "id" FROM "profiles" ORDER BY "created_at" LIMIT 1) WHERE "profile_id" IS NULL;--> statement-breakpoint
UPDATE "conversations" SET "profile_id" = (SELECT "id" FROM "profiles" ORDER BY "created_at" LIMIT 1) WHERE "profile_id" IS NULL;--> statement-breakpoint
UPDATE "documents" SET "profile_id" = (SELECT "id" FROM "profiles" ORDER BY "created_at" LIMIT 1) WHERE "profile_id" IS NULL;--> statement-breakpoint
UPDATE "matches" SET "profile_id" = (SELECT "id" FROM "profiles" ORDER BY "created_at" LIMIT 1) WHERE "profile_id" IS NULL;--> statement-breakpoint
UPDATE "search_queries" SET "profile_id" = (SELECT "id" FROM "profiles" ORDER BY "created_at" LIMIT 1) WHERE "profile_id" IS NULL;--> statement-breakpoint

-- Step 6: enforce NOT NULL
ALTER TABLE "profiles" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "search_queries" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint

-- Step 7: create foreign keys
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 8: change matches unique index from jobId to (profileId, jobId)
DROP INDEX "matches_job_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "matches_profile_id_job_id_idx" ON "matches" USING btree ("profile_id","job_id");--> statement-breakpoint

-- Step 9: enforce one conversation per profile
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_profile_id_unique" UNIQUE("profile_id");
