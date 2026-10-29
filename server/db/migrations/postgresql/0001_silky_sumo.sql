CREATE TABLE "member_merges" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"source_membership_id" text NOT NULL,
	"target_membership_id" text NOT NULL,
	"merged_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_memberships" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "room_memberships" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "room_memberships" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "member_merges" ADD CONSTRAINT "member_merges_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_merges" ADD CONSTRAINT "member_merges_source_membership_id_room_memberships_id_fk" FOREIGN KEY ("source_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_merges" ADD CONSTRAINT "member_merges_target_membership_id_room_memberships_id_fk" FOREIGN KEY ("target_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_merges" ADD CONSTRAINT "member_merges_merged_by_user_id_user_id_fk" FOREIGN KEY ("merged_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_memberships_active_user_unique" ON "room_memberships" USING btree ("room_id","user_id") WHERE "room_memberships"."is_active" = true AND "room_memberships"."user_id" IS NOT NULL;