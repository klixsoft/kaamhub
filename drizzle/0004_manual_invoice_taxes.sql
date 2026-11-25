CREATE TYPE "public"."tax_kind" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TABLE "invoice_tax" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"kind" "tax_kind" NOT NULL,
	"rate" numeric(7, 4),
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_tax" ADD CONSTRAINT "invoice_tax_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_tax_invoice_idx" ON "invoice_tax" USING btree ("invoice_id","position");--> statement-breakpoint
INSERT INTO "invoice_tax" ("invoice_id", "position", "name", "kind", "rate", "amount")
SELECT "id", 0, coalesce("format"->>'taxName', 'Tax'), 'percentage', "tax_rate", "tax_amount" FROM "invoice" WHERE "tax_amount" > 0;--> statement-breakpoint
ALTER TABLE "invoice" DROP COLUMN "tax_treatment";--> statement-breakpoint
ALTER TABLE "invoice" DROP COLUMN "tax_rate";--> statement-breakpoint
ALTER TABLE "managed_service" DROP COLUMN "tax_treatment";