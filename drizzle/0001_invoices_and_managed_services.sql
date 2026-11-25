CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'quarterly', 'half_yearly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('NPR', 'USD');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash', 'cheque', 'esewa', 'khalti', 'fonepay', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('domain', 'hosting', 'maintenance', 'email', 'other');--> statement-breakpoint
CREATE TYPE "public"."tax_treatment" AS ENUM('vat', 'zero_rated', 'exempt');--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text,
	"rate" numeric(14, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"paid_on" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"note" text,
	"recorded_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_sequence" (
	"fiscal_year" text PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text,
	"fiscal_year" text,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"service_id" uuid,
	"service_period_start" date,
	"currency" "currency" DEFAULT 'NPR' NOT NULL,
	"tax_treatment" "tax_treatment" DEFAULT 'vat' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"seller_name" text,
	"seller_address" text,
	"seller_tax_number" text,
	"buyer_name" text NOT NULL,
	"buyer_address" text,
	"buyer_tax_number" text,
	"subtotal" numeric(14, 2) DEFAULT 0 NOT NULL,
	"discount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"taxable_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT 0 NOT NULL,
	"vat_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total" numeric(14, 2) DEFAULT 0 NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT 0 NOT NULL,
	"notes" text,
	"issued_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managed_service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "service_type" NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"status" "service_status" DEFAULT 'active' NOT NULL,
	"started_on" date,
	"expires_on" date,
	"billing_cycle" "billing_cycle" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" "currency" DEFAULT 'NPR' NOT NULL,
	"tax_treatment" "tax_treatment" DEFAULT 'vat' NOT NULL,
	"next_billing_on" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "manages_infrastructure" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_service_id_managed_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."managed_service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_service" ADD CONSTRAINT "managed_service_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_item_invoice_idx" ON "invoice_item" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoice_payment_invoice_idx" ON "invoice_payment" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_number_idx" ON "invoice" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_service_period_idx" ON "invoice" USING btree ("service_id","service_period_start");--> statement-breakpoint
CREATE INDEX "invoice_client_idx" ON "invoice" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoice_project_idx" ON "invoice" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" USING btree ("status","issue_date");--> statement-breakpoint
CREATE INDEX "managed_service_project_idx" ON "managed_service" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "managed_service_billing_idx" ON "managed_service" USING btree ("status","next_billing_on");--> statement-breakpoint
CREATE INDEX "managed_service_expiry_idx" ON "managed_service" USING btree ("status","expires_on");