DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "rate_limit" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "email_verified";