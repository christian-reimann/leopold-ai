CREATE TYPE "public"."application_color_scheme" AS ENUM('slate', 'blue', 'emerald', 'burgundy');--> statement-breakpoint
CREATE TYPE "public"."application_generation_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."application_language" AS ENUM('de', 'en');--> statement-breakpoint
CREATE TYPE "public"."application_layout" AS ENUM('standard');--> statement-breakpoint
CREATE TYPE "public"."application_pdf_status" AS ENUM('pending', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."application_tone" AS ENUM('formal', 'neutral', 'confident', 'creative');--> statement-breakpoint
CREATE TYPE "public"."personality_trait" AS ENUM('analytical', 'creative', 'team_oriented', 'results_oriented', 'empathetic', 'down_to_earth');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "tone" "application_tone" DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "personality" "personality_trait"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "language" "application_language" DEFAULT 'de' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "layout_template" "application_layout" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "color_scheme" "application_color_scheme" DEFAULT 'slate' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "generation_status" "application_generation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "pdf_status" "application_pdf_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "pdf_error" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id","created_at");