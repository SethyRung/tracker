ALTER TABLE "rooms" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "deleted_by_user_id" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_deleted_by_user_id_user_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rooms_deleted_at_idx" ON "rooms" USING btree ("deleted_at");