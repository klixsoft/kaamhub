ALTER TABLE "task" ADD COLUMN "requested_by_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_request_idx" ON "task" USING btree ("project_id","requested_by_id");