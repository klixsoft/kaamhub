ALTER TABLE "project" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "project" DROP COLUMN "manages_infrastructure";--> statement-breakpoint
ALTER TABLE "managed_service" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."project_type";--> statement-breakpoint
DROP TYPE "public"."service_type";