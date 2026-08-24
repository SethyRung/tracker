import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "#auth/schema";

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    usdEnabled: boolean("usd_enabled").notNull().default(true),
    khrEnabled: boolean("khr_enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedByUserId: text("deleted_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
  },
  (t) => [index("rooms_deleted_at_idx").on(t.deletedAt)],
);

export const roomMemberships = pgTable("room_memberships", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["admin", "member"] })
    .notNull()
    .default("member"),
  displayName: text("display_name").notNull(),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  color: text("color"),
  sharePercentBps: integer("share_percent_bps").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  recurringType: text("recurring_type", { enum: ["unlimited", "once", "recurring"] })
    .notNull()
    .default("unlimited"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteLinks = pgTable("invite_links", {
  tokenHash: text("token_hash").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  createdByMembershipId: text("created_by_membership_id")
    .notNull()
    .references(() => roomMemberships.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedByMembershipId: text("used_by_membership_id").references(() => roomMemberships.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const entries = pgTable("entries", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  currency: text("currency", { enum: ["USD", "KHR"] }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  date: timestamp("date").notNull(),
  paidByMembershipId: text("paid_by_membership_id")
    .notNull()
    .references(() => roomMemberships.id, { onDelete: "restrict" }),
  notes: text("notes"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  templateId: text("template_id").references(() => recurringTemplates.id, {
    onDelete: "set null",
  }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const entryWeights = pgTable(
  "entry_weights",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => roomMemberships.id, { onDelete: "cascade" }),
    weightBps: integer("weight_bps").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.membershipId] })],
);

export const recurringTemplates = pgTable("recurring_templates", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  currency: text("currency", { enum: ["USD", "KHR"] }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  // Who actually fronts this recurring expense. Nullable: when unset the
  // materializer falls back to the longest-tenured active member (the
  // behaviour from before this column existed).
  paidByMembershipId: text("paid_by_membership_id").references(() => roomMemberships.id, {
    onDelete: "set null",
  }),
  memberSnapshot: jsonb("member_snapshot")
    .$type<Array<{ membershipId: string; weightBps: number }>>()
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const monthSnapshots = pgTable(
  "month_snapshots",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    yyyymm: text("yyyymm").notNull(),
    status: text("status", { enum: ["open", "closed"] })
      .notNull()
      .default("open"),
    closedAt: timestamp("closed_at"),
    closedByUserId: text("closed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("month_snapshots_room_yyyymm_unique").on(t.roomId, t.yyyymm)],
);
