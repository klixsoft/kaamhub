ALTER TABLE "invoice" ALTER COLUMN "tax_treatment" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invoice" ALTER COLUMN "tax_treatment" SET DEFAULT 'standard'::text;--> statement-breakpoint
ALTER TABLE "managed_service" ALTER COLUMN "tax_treatment" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "managed_service" ALTER COLUMN "tax_treatment" SET DEFAULT 'standard'::text;--> statement-breakpoint
UPDATE "invoice" SET "tax_treatment" = 'standard' WHERE "tax_treatment" = 'vat';--> statement-breakpoint
UPDATE "managed_service" SET "tax_treatment" = 'standard' WHERE "tax_treatment" = 'vat';--> statement-breakpoint
DROP TYPE "public"."tax_treatment";--> statement-breakpoint
CREATE TYPE "public"."tax_treatment" AS ENUM('standard', 'zero_rated', 'exempt');--> statement-breakpoint
ALTER TABLE "invoice" ALTER COLUMN "tax_treatment" SET DEFAULT 'standard'::"public"."tax_treatment";--> statement-breakpoint
ALTER TABLE "invoice" ALTER COLUMN "tax_treatment" SET DATA TYPE "public"."tax_treatment" USING "tax_treatment"::"public"."tax_treatment";--> statement-breakpoint
ALTER TABLE "managed_service" ALTER COLUMN "tax_treatment" SET DEFAULT 'standard'::"public"."tax_treatment";--> statement-breakpoint
ALTER TABLE "managed_service" ALTER COLUMN "tax_treatment" SET DATA TYPE "public"."tax_treatment" USING "tax_treatment"::"public"."tax_treatment";--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "format" jsonb;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "seller_contact" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "tax_amount" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "invoice" SET "tax_rate" = "vat_rate", "tax_amount" = "vat_amount";
