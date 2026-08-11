CREATE TABLE "month_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"yyyymm" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"closed_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "month_snapshots_room_yyyymm_unique" UNIQUE("room_id","yyyymm")
);
--> statement-breakpoint
ALTER TABLE "month_snapshots" ADD CONSTRAINT "month_snapshots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_snapshots" ADD CONSTRAINT "month_snapshots_closed_by_user_id_user_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;