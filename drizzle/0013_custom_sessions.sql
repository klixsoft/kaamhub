CREATE TABLE "auth_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"previous_token_hash" text,
	"rotated_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "github_user_id" text;--> statement-breakpoint
ALTER TABLE "password_token" ADD CONSTRAINT "password_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_token_user_idx" ON "password_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_session_user_idx" ON "user_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_session_expires_idx" ON "user_session" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_github_user_id_unique" UNIQUE("github_user_id");--> statement-breakpoint
UPDATE "user" SET "password_hash" = "account"."password" FROM "account" WHERE "account"."user_id" = "user"."id" AND "account"."provider_id" = 'credential' AND "account"."password" IS NOT NULL;--> statement-breakpoint
UPDATE "user" SET "github_user_id" = "account"."account_id" FROM "account" WHERE "account"."user_id" = "user"."id" AND "account"."provider_id" = 'github';
