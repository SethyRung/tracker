CREATE TABLE "invite_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"created_by_membership_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"used_by_membership_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_created_by_membership_id_room_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_used_by_membership_id_room_memberships_id_fk" FOREIGN KEY ("used_by_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE set null ON UPDATE no action;