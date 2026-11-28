CREATE TYPE "public"."github_link_kind" AS ENUM('commit', 'pull_request');--> statement-breakpoint
CREATE TYPE "public"."pull_request_state" AS ENUM('open', 'draft', 'merged', 'closed');--> statement-breakpoint
CREATE TABLE "task_github_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"kind" "github_link_kind" NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"author_login" text,
	"state" "pull_request_state",
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_github_link" ADD CONSTRAINT "task_github_link_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_github_link" ADD CONSTRAINT "task_github_link_repository_id_github_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_github_link_unique_idx" ON "task_github_link" USING btree ("task_id","repository_id","kind","external_id");--> statement-breakpoint
CREATE INDEX "task_github_link_repo_idx" ON "task_github_link" USING btree ("repository_id","kind","external_id");