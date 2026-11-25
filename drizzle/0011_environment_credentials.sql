CREATE TABLE "environment_credential_access" (
	"credential_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "environment_credential_access_credential_id_user_id_pk" PRIMARY KEY("credential_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "environment_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment_id" uuid NOT NULL,
	"label" text NOT NULL,
	"username" text,
	"login_url" text,
	"secret_encrypted" text NOT NULL,
	"notes_encrypted" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "environment_credential_access" ADD CONSTRAINT "environment_credential_access_credential_id_environment_credential_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."environment_credential"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_credential_access" ADD CONSTRAINT "environment_credential_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_credential" ADD CONSTRAINT "environment_credential_environment_id_project_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."project_environment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_credential" ADD CONSTRAINT "environment_credential_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "environment_credential_access_user_idx" ON "environment_credential_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "environment_credential_environment_idx" ON "environment_credential" USING btree ("environment_id");