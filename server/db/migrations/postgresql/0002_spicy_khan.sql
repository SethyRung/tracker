CREATE TABLE "bill_weights" (
	"bill_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"weight_bps" integer NOT NULL,
	CONSTRAINT "bill_weights_bill_id_membership_id_pk" PRIMARY KEY("bill_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"category_id" text,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"date" timestamp NOT NULL,
	"paid_by_membership_id" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"template_id" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_weights" ADD CONSTRAINT "bill_weights_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_weights" ADD CONSTRAINT "bill_weights_membership_id_room_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_paid_by_membership_id_room_memberships_id_fk" FOREIGN KEY ("paid_by_membership_id") REFERENCES "public"."room_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;