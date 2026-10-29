import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResponseCode } from "../../shared/types/response";
import { isValidMonthKey, monthRange } from "../../shared/utils/date";
import { alreadyMaterialized, planDraftForTemplate } from "../../shared/utils/recurring";
import { formatMoney } from "../../shared/types/money";

const context = vi.hoisted(() => ({ db: null as unknown, schema: null as unknown }));
const joiningUser = {
  id: "user-b",
  email: "sokha@example.com",
  emailVerified: true,
  phone: "+85512345678",
};
vi.mock("@nuxthub/db", () => ({
  get db() {
    return context.db;
  },
  get schema() {
    return context.schema;
  },
}));
vi.mock("#auth/schema", async () => {
  const { pgTable, text } = await import("drizzle-orm/pg-core");
  return {
    user: pgTable("user", {
      id: text("id").primaryKey(),
      name: text("name"),
      email: text("email"),
      image: text("image"),
    }),
  };
});
vi.mock("#shared/utils/overview", async () => import("../../shared/utils/overview"));
vi.mock("~~/shared/utils/settle", async () => import("../../shared/utils/settle"));

let merge: typeof import("../../server/api/rooms/[id]/members/merge.post").default;
let list: typeof import("../../server/api/rooms/[id]/members.get").default;
let overview: typeof import("../../server/api/rooms/[id]/overview.get").default;
let join: typeof import("../../server/api/rooms/join.post").default;
let templates: typeof import("../../server/api/rooms/[id]/templates/index.get").default;
let createCategory: typeof import("../../server/api/rooms/[id]/categories/index.post").default;
let createMember: typeof import("../../server/api/rooms/[id]/members/index.post").default;
let settlement: typeof import("../../server/api/rooms/[id]/settle/[yyyymm].get").default;
let client: PGlite;

beforeAll(async () => {
  client = new PGlite();
  await client.exec(
    await readFile("server/db/migrations/postgresql/0000_nice_ender_wiggin.sql", "utf8"),
  );
  await client.exec(await readFile("server/db/migrations/postgresql/0001_silky_sumo.sql", "utf8"));
  await client.exec(
    await readFile("server/db/migrations/postgresql/0002_slim_magdalene.sql", "utf8"),
  );
  await client.exec(`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ('admin', 'Admin', 'admin@example.com', true, now(), now()), ('user-a', 'Member', 'member@example.com', true, now(), now()), ('user-b', 'Sokha', 'sokha@example.com', true, now(), now());
    INSERT INTO rooms (id, name, created_by_user_id) VALUES ('room-a', 'Home', 'admin');`);
  const schema = await import("../../server/db/schema");
  context.schema = schema;
  context.db = drizzle(client, { schema, casing: "snake_case" });
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("getRoomId", () => "room-a");
  vi.stubGlobal("requireRoomAdmin", async () => ({ userId: "admin" }));
  vi.stubGlobal("requireRoomContext", async () => ({ userId: "admin", role: "admin" }));
  vi.stubGlobal("requireUserSession", async () => ({ user: joiningUser }));
  vi.stubGlobal("findValidInvite", async () => ({
    ok: true,
    link: { roomId: "room-a", tokenHash: "token" },
  }));
  vi.stubGlobal("nextMemberColor", () => "#abcdef");
  vi.stubGlobal(
    "readValidatedBody",
    (event: { body: unknown }, parse: (body: unknown) => unknown) => parse(event.body),
  );
  vi.stubGlobal(
    "getValidatedQuery",
    (event: { query: unknown }, parse: (query: unknown) => unknown) => parse(event.query),
  );
  vi.stubGlobal("isValidMonthKey", isValidMonthKey);
  vi.stubGlobal("monthRange", monthRange);
  vi.stubGlobal("monthKey", () => "2026-06");
  vi.stubGlobal("getMonthKeyParam", () => "2026-06");
  vi.stubGlobal("formatMoney", formatMoney);
  vi.stubGlobal("getMonthSnapshot", async () => null);
  vi.stubGlobal("BPS_TOTAL", 10000);
  vi.stubGlobal("alreadyMaterialized", alreadyMaterialized);
  vi.stubGlobal("planDraftForTemplate", planDraftForTemplate);
  const roomUtils = await import("../../server/utils/room");
  const recurringUtils = await import("../../server/utils/recurring");
  const settlementUtils = await import("../../server/utils/settle");
  vi.stubGlobal("isRoomActiveCondition", roomUtils.isRoomActiveCondition);
  vi.stubGlobal("findActiveRoomMember", roomUtils.findActiveRoomMember);
  vi.stubGlobal("materializeRecurringDrafts", recurringUtils.materializeRecurringDrafts);
  vi.stubGlobal("settleRoom", settlementUtils.settleRoom);
  vi.stubGlobal("newId", () => crypto.randomUUID());
  vi.stubGlobal("ApiResponseCode", ApiResponseCode);
  vi.stubGlobal("createResponse", (status: unknown, data?: unknown) => ({ status, data }));
  merge = (await import("../../server/api/rooms/[id]/members/merge.post")).default;
  list = (await import("../../server/api/rooms/[id]/members.get")).default;
  overview = (await import("../../server/api/rooms/[id]/overview.get")).default;
  join = (await import("../../server/api/rooms/join.post")).default;
  templates = (await import("../../server/api/rooms/[id]/templates/index.get")).default;
  createCategory = (await import("../../server/api/rooms/[id]/categories/index.post")).default;
  createMember = (await import("../../server/api/rooms/[id]/members/index.post")).default;
  settlement = (await import("../../server/api/rooms/[id]/settle/[yyyymm].get")).default;
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await client?.close();
});
beforeEach(async () => {
  joiningUser.emailVerified = true;
  joiningUser.phone = "+85512345678";
  await client.exec(`DELETE FROM invite_links; DELETE FROM member_merges; DELETE FROM entry_weights; DELETE FROM entries; DELETE FROM recurring_templates; DELETE FROM categories; DELETE FROM month_snapshots; DELETE FROM room_memberships;
    INSERT INTO room_memberships (id, room_id, user_id, nickname, joined_at, contact_email, contact_phone) VALUES ('placeholder-a', 'room-a', NULL, 'Sokha', '2026-01-01', 'sokha@example.com', '+85512345678'), ('member-a', 'room-a', 'user-a', NULL, '2026-01-03', NULL, NULL);
    INSERT INTO invite_links (token_hash, room_id, created_by_membership_id, expires_at) VALUES ('token', 'room-a', 'member-a', '2099-01-01');`);
});

describe("placeholder room members", () => {
  it("lets an admin add a member without an account", async () => {
    const result = await createMember({
      body: { name: "Dara", email: "Dara@Example.com", phone: "+855 12 345 999" },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.Success);
    const members = await list({} as never);
    expect(members.data.find((member) => member.id === result.data.id)).toMatchObject({
      nickname: "Dara",
      userId: null,
      email: "dara@example.com",
      contactPhone: "+85512345999",
    });
  });
});

describe("joining with a placeholder", () => {
  it("links the existing member when verified email and phone match", async () => {
    const result = await join({ body: { token: "token" } } as never);
    expect(result.data.membershipId).toBe("placeholder-a");
    const members = await list({} as never);
    expect(members.data.find((member) => member.id === "placeholder-a")?.userId).toBe("user-b");
  });

  it("creates a separate member if the phone does not match", async () => {
    joiningUser.phone = "+85599888777";
    const result = await join({ body: { token: "token" } } as never);
    expect(result.data.membershipId).not.toBe("placeholder-a");
    const members = await list({} as never);
    expect(members.data.find((member) => member.id === "placeholder-a")?.userId).toBeNull();
  });

  it("creates a separate member if the email is unverified", async () => {
    joiningUser.emailVerified = false;
    const result = await join({ body: { token: "token" } } as never);
    expect(result.data.membershipId).not.toBe("placeholder-a");
  });

  it("does not claim a placeholder when multiple members match", async () => {
    await client.exec(
      `INSERT INTO room_memberships (id, room_id, nickname, contact_email, contact_phone) VALUES ('placeholder-b', 'room-a', 'Sokha', 'sokha@example.com', '+85512345678')`,
    );
    const result = await join({ body: { token: "token" } } as never);
    expect(result.data.membershipId).not.toBe("placeholder-a");
    expect(result.data.membershipId).not.toBe("placeholder-b");
  });

  it("does not merge a placeholder when the account is already a member", async () => {
    joiningUser.id = "user-a";
    try {
      const result = await join({ body: { token: "token" } } as never);
      expect(result.data).toMatchObject({ membershipId: "member-a", alreadyMember: true });
      const members = await list({} as never);
      expect(members.data.find((member) => member.id === "placeholder-a")?.userId).toBeNull();
    } finally {
      joiningUser.id = "user-b";
    }
  });
});

describe("placeholder recurring bills", () => {
  it("materializes a recurring bill paid by a placeholder", async () => {
    const result = await createCategory({
      body: {
        name: "Rent",
        recurringType: "recurring",
        currency: "USD",
        amountMinor: 1200,
        dayOfMonth: 1,
        isActive: true,
        paidByMembershipId: "placeholder-a",
        memberSnapshot: [{ membershipId: "placeholder-a", weightBps: 10000 }],
      },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.Success);
    const view = await overview({ query: { month: "2026-06" } } as never);
    expect(view.data.entries[0]).toMatchObject({
      paidByMembershipId: "placeholder-a",
      amountMinor: 1200,
      status: "published",
    });
  });
});

describe("merge room members", () => {
  it("lets an admin merge a placeholder into an account-linked member", async () => {
    const result = await merge({
      body: { sourceId: "placeholder-a", targetId: "member-a" },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.Success);
    const members = await list({} as never);
    expect(members.data.map((member: { id: string }) => member.id)).toEqual(["member-a"]);
  });

  it.each([
    ["room nickname", "Dara", "Dara"],
    ["account name", null, "Member"],
  ])("uses the joined member's %s for merged bills", async (_description, nickname, expected) => {
    await client.query("UPDATE room_memberships SET nickname = $1 WHERE id = 'member-a'", [
      nickname,
    ]);
    await client.exec(`INSERT INTO entries (id, room_id, currency, amount_minor, date, paid_by_membership_id, status, created_by_user_id) VALUES ('bill-a', 'room-a', 'USD', 1000, '2026-06-10', 'placeholder-a', 'published', 'admin');
      INSERT INTO entry_weights (entry_id, membership_id, weight_bps) VALUES ('bill-a', 'placeholder-a', 10000);`);
    const result = await merge({
      body: { sourceId: "placeholder-a", targetId: "member-a" },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.Success);
    const view = await overview({ query: { month: "2026-06" } } as never);
    const payer = view.data.members.find(
      (member) => member.id === view.data.entries[0]?.paidByMembershipId,
    );
    expect(payer?.nickname || payer?.userName).toBe(expected);
  });

  it("preserves the combined balance when both members shared a bill", async () => {
    await client.exec(`INSERT INTO entries (id, room_id, currency, amount_minor, date, paid_by_membership_id, status, created_by_user_id) VALUES ('bill-a', 'room-a', 'USD', 1000, '2026-06-10', 'placeholder-a', 'published', 'admin');
      INSERT INTO entry_weights (entry_id, membership_id, weight_bps) VALUES ('bill-a', 'placeholder-a', 5000), ('bill-a', 'member-a', 5000);`);
    const result = await merge({
      body: { sourceId: "placeholder-a", targetId: "member-a" },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.Success);
    const view = await overview({ query: { month: "2026-06" } } as never);
    expect(view.data.entries[0]).toMatchObject({
      paidByMembershipId: "member-a",
      weights: [{ membershipId: "member-a", weightBps: 10000 }],
    });
    expect(
      view.data.settlement.usd.members.find((member) => member.membershipId === "member-a")
        ?.balance,
    ).toBe(0);
  });

  it("hides a merged placeholder while retaining a former member with a balance", async () => {
    await client.exec(`INSERT INTO room_memberships (id, room_id, user_id, nickname, joined_at, left_at, is_active) VALUES ('former-a', 'room-a', 'admin', 'Former', '2026-01-02', '2026-06-30', false);
      INSERT INTO entries (id, room_id, currency, amount_minor, date, paid_by_membership_id, status, created_by_user_id) VALUES ('bill-a', 'room-a', 'USD', 600, '2026-06-10', 'former-a', 'published', 'admin');
      INSERT INTO entry_weights (entry_id, membership_id, weight_bps) VALUES ('bill-a', 'member-a', 10000);`);
    const merged = await merge({
      body: { sourceId: "placeholder-a", targetId: "member-a" },
    } as never);
    expect(merged.status.code).toBe(ApiResponseCode.Success);
    const result = await settlement({} as never);
    expect(result.data.usd.members.map((member) => member.membershipId)).toEqual([
      "former-a",
      "member-a",
    ]);
    expect(result.data.usd.suggestTransfer).toMatchObject([
      { fromMembershipId: "member-a", toMembershipId: "former-a", amountMinor: 600 },
    ]);
  });

  it("retains a merged placeholder if it still has financial activity", async () => {
    await merge({ body: { sourceId: "placeholder-a", targetId: "member-a" } } as never);
    await client.exec(`INSERT INTO entries (id, room_id, currency, amount_minor, date, paid_by_membership_id, status, created_by_user_id) VALUES ('bill-a', 'room-a', 'USD', 100, '2026-06-10', 'placeholder-a', 'published', 'admin');
      INSERT INTO entry_weights (entry_id, membership_id, weight_bps) VALUES ('bill-a', 'member-a', 10000);`);
    const result = await settlement({} as never);
    expect(
      result.data.usd.members.find((member) => member.membershipId === "placeholder-a")?.balance,
    ).toBe(100);
  });

  it("rejects a merge if rounding would change another member's historical balance", async () => {
    await client.exec(`INSERT INTO room_memberships (id, room_id, user_id, joined_at) VALUES ('admin-member', 'room-a', 'admin', '2026-01-02');
      INSERT INTO entries (id, room_id, currency, amount_minor, date, paid_by_membership_id, status, created_by_user_id) VALUES ('bill-a', 'room-a', 'USD', 100, '2026-06-10', 'placeholder-a', 'published', 'admin');
      INSERT INTO entry_weights (entry_id, membership_id, weight_bps) VALUES ('bill-a', 'placeholder-a', 3333), ('bill-a', 'member-a', 3333), ('bill-a', 'admin-member', 3334);`);
    const result = await merge({
      body: { sourceId: "placeholder-a", targetId: "member-a" },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.InvalidRequest);
    const members = await list({} as never);
    expect(members.data.map((member: { id: string }) => member.id)).toContain("placeholder-a");
  });

  it("preserves recurring payers and combines duplicate template shares", async () => {
    await client.exec(`INSERT INTO categories (id, room_id, name, recurring_type) VALUES ('rent', 'room-a', 'Rent', 'recurring');
      INSERT INTO recurring_templates (id, room_id, category_id, currency, amount_minor, paid_by_membership_id, member_snapshot) VALUES ('template-a', 'room-a', 'rent', 'KHR', 120000, 'placeholder-a', '[{"membershipId":"placeholder-a","weightBps":5000},{"membershipId":"member-a","weightBps":5000}]');`);
    const result = await merge({
      body: { sourceId: "placeholder-a", targetId: "member-a" },
    } as never);
    expect(result.status.code).toBe(ApiResponseCode.Success);
    const rows = await templates({} as never);
    expect(rows.data[0]).toMatchObject({
      paidByMembershipId: "member-a",
      memberSnapshot: [{ membershipId: "member-a", weightBps: 10000 }],
    });
  });
});
