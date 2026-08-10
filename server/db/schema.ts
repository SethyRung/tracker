import { boolean, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "#auth/schema";

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  usdEnabled: boolean("usd_enabled").notNull().default(true),
  khrEnabled: boolean("khr_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteLinks = pgTable("invite_links", {
  // Token is sent in the URL as the raw 8-char base62 string. The hash is
  // what's stored — the raw token is never persisted.
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

export const bills = pgTable("bills", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  currency: text("currency", { enum: ["USD", "KHR"] }).notNull(),
  amountMinor: integer("amount_minor").notNull(),
  date: timestamp("date").notNull(),
  paidByMembershipId: text("paid_by_membership_id")
    .notNull()
    .references(() => roomMemberships.id, { onDelete: "restrict" }),
  notes: text("notes"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  templateId: text("template_id"),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const billWeights = pgTable(
  "bill_weights",
  {
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => roomMemberships.id, { onDelete: "cascade" }),
    weightBps: integer("weight_bps").notNull(),
  },
  (t) => [primaryKey({ columns: [t.billId, t.membershipId] })],
);
