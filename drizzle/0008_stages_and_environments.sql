CREATE TYPE "public"."environment_health" AS ENUM('unknown', 'up', 'down');--> statement-breakpoint
CREATE TYPE "public"."environment_kind" AS ENUM('production', 'staging', 'development', 'other');--> statement-breakpoint
CREATE TABLE "project_environment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "environment_kind" DEFAULT 'production' NOT NULL,
	"url" text,
	"branch" text,
	"hosting_provider" text,
	"domain_registrar" text,
	"domain_expires_on" date,
	"hosting_expires_on" date,
	"notes" text,
	"health" "environment_health" DEFAULT 'unknown' NOT NULL,
	"last_status_code" integer,
	"last_response_ms" integer,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_stage_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "project_environment" ADD CONSTRAINT "project_environment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_environment_project_idx" ON "project_environment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_environment_domain_expiry_idx" ON "project_environment" USING btree ("domain_expires_on");--> statement-breakpoint
CREATE INDEX "project_environment_hosting_expiry_idx" ON "project_environment" USING btree ("hosting_expires_on");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_stage_id_project_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_stage_idx" ON "project" USING btree ("stage_id");--> statement-breakpoint
INSERT INTO "project_stage" ("name") VALUES ('Discovery'), ('In development'), ('Testing'), ('Live'), ('Support and maintenance') ON CONFLICT ("name") DO NOTHING;
