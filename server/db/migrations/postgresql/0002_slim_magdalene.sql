ALTER TABLE "member_merges" DROP CONSTRAINT "member_merges_source_membership_id_room_memberships_id_fk";
--> statement-breakpoint
ALTER TABLE "member_merges" DROP CONSTRAINT "member_merges_target_membership_id_room_memberships_id_fk";
--> statement-breakpoint
ALTER TABLE "member_merges" ADD CONSTRAINT "member_merges_source_membership_id_room_memberships_id_fk" FOREIGN KEY ("source_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_merges" ADD CONSTRAINT "member_merges_target_membership_id_room_memberships_id_fk" FOREIGN KEY ("target_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE cascade ON UPDATE no action;