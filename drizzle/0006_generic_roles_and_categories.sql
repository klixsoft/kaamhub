CREATE TABLE "project_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "service_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "project_member" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "project_member" ALTER COLUMN "role" SET DEFAULT 'member'::text;--> statement-breakpoint
UPDATE "project_member" SET "role" = 'member' WHERE "role" IN ('developer', 'designer', 'qa');--> statement-breakpoint
DROP TYPE "public"."project_role";--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('manager', 'member', 'viewer');--> statement-breakpoint
ALTER TABLE "project_member" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."project_role";--> statement-breakpoint
ALTER TABLE "project_member" ALTER COLUMN "role" SET DATA TYPE "public"."project_role" USING "role"::"public"."project_role";--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "recurring_billing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "managed_service" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_category_id_project_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."project_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_service" ADD CONSTRAINT "managed_service_category_id_service_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_category_idx" ON "project" USING btree ("category_id");;--> statement-breakpoint
INSERT INTO "project_category" ("name")
SELECT DISTINCT CASE "type"::text
  WHEN 'website' THEN 'Website' WHEN 'mobile_app' THEN 'Mobile app' WHEN 'software' THEN 'Software'
  WHEN 'maintenance' THEN 'Maintenance' ELSE 'Other' END
FROM "project" ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "project_category" ("name") VALUES ('Client project'), ('Internal'), ('Retainer') ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "project" SET
  "recurring_billing" = "manages_infrastructure",
  "category_id" = (SELECT "id" FROM "project_category" WHERE "name" = CASE "project"."type"::text
    WHEN 'website' THEN 'Website' WHEN 'mobile_app' THEN 'Mobile app' WHEN 'software' THEN 'Software'
    WHEN 'maintenance' THEN 'Maintenance' ELSE 'Other' END);--> statement-breakpoint
INSERT INTO "service_category" ("name")
SELECT DISTINCT CASE "type"::text
  WHEN 'domain' THEN 'Domain' WHEN 'hosting' THEN 'Hosting' WHEN 'maintenance' THEN 'Maintenance'
  WHEN 'email' THEN 'Email' ELSE 'Other' END
FROM "managed_service" ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "service_category" ("name") VALUES ('Subscription'), ('Retainer'), ('Maintenance'), ('Support plan') ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "managed_service" SET "category_id" = (SELECT "id" FROM "service_category" WHERE "name" = CASE "managed_service"."type"::text
  WHEN 'domain' THEN 'Domain' WHEN 'hosting' THEN 'Hosting' WHEN 'maintenance' THEN 'Maintenance'
  WHEN 'email' THEN 'Email' ELSE 'Other' END);
