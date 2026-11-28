ALTER TYPE "public"."invoice_status" ADD VALUE 'credited' BEFORE 'cancelled';--> statement-breakpoint
CREATE TABLE "credit_note_sequence" (
	"fiscal_year" text PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"number" text NOT NULL,
	"fiscal_year" text NOT NULL,
	"issue_date" date NOT NULL,
	"reason" text NOT NULL,
	"lines" jsonb NOT NULL,
	"taxes" jsonb NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"tax_amount" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_note_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "amount_credited" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_note" ADD CONSTRAINT "credit_note_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note" ADD CONSTRAINT "credit_note_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_note_invoice_idx" ON "credit_note" USING btree ("invoice_id");