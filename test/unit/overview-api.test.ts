import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidMonthKey, monthRange } from "../../shared/utils/date";
import { ApiResponseCode } from "../../shared/types/response";

const mocks = vi.hoisted(() => ({
  entries: vi.fn(),
  categories: vi.fn(),
  weights: vi.fn(),
  select: vi.fn(),
  context: vi.fn(),
  snapshot: vi.fn(),
}));

vi.mock("@nuxthub/db", () => ({
  db: {
    query: {
      entries: { findMany: mocks.entries },
      categories: { findMany: mocks.categories },
      entryWeights: { findMany: mocks.weights },
    },
    select: mocks.select,
  },
  schema: {
    roomMemberships: {
      roomId: "memberships.room_id",
      userId: "memberships.user_id",
      joinedAt: "memberships.joined_at",
    },
  },
}));
vi.mock("#auth/schema", () => ({ user: { id: "user.id", name: "user.name" } }));
vi.mock("#shared/utils/overview", async () => import("../../shared/utils/overview"));

let handler: typeof import("../../server/api/rooms/[id]/overview.get").default;
const event = { query: { month: "2026-06" } };
const active = {
  id: "active",
  roomId: "room-a",
  userId: "user-a",
  nickname: "Alex",
  joinedAt: new Date("2026-01-01"),
  leftAt: null,
  isActive: true,
};
const departed = {
  ...active,
  id: "departed",
  userId: "user-b",
  nickname: "Sam",
  joinedAt: new Date("2026-01-02"),
  leftAt: new Date("2026-06-15"),
  isActive: false,
};

beforeAll(async () => {
  vi.stubGlobal("defineEventHandler", (fn: unknown) => fn);
  vi.stubGlobal("getRoomId", () => "room-a");
  vi.stubGlobal("requireRoomContext", mocks.context);
  vi.stubGlobal("getValidatedQuery", (e: typeof event, parse: (query: unknown) => unknown) =>
    parse(e.query),
  );
  vi.stubGlobal("isValidMonthKey", isValidMonthKey);
  vi.stubGlobal("monthKey", () => "2026-06");
  vi.stubGlobal("monthRange", monthRange);
  vi.stubGlobal("getMonthSnapshot", mocks.snapshot);
  vi.stubGlobal("ApiResponseCode", ApiResponseCode);
  vi.stubGlobal("createResponse", (status: unknown, data: unknown) => ({ status, data }));
  handler = (await import("../../server/api/rooms/[id]/overview.get")).default;
});

afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({ role: "member" });
  mocks.entries.mockResolvedValue([]);
  mocks.categories.mockResolvedValue([]);
  mocks.weights.mockResolvedValue([]);
  mocks.snapshot.mockResolvedValue(null);
  const memberQuery = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([
      { membership: active, userName: "Alex Smith" },
      { membership: departed, userName: "Sam Smith" },
    ]),
  };
  mocks.select.mockReturnValue(memberQuery);
});

async function overview(query: Record<string, unknown> = event.query) {
  return handler({ query } as never);
}

describe("GET /api/rooms/:id/overview", () => {
  it("returns an open empty month without querying weights", async () => {
    const response = await overview();
    expect(response.status.code).toBe(ApiResponseCode.Success);
    expect(response.data).toMatchObject({
      entries: [],
      members: [{ id: "active" }],
      categories: [],
      snapshot: { roomId: "room-a", yyyymm: "2026-06", status: "open" },
      settlement: { yyyymm: "2026-06", usd: { suggestTransfer: [] }, khr: { suggestTransfer: [] } },
    });
    expect(response.data?.members).toHaveLength(1);
    expect(mocks.weights).not.toHaveBeenCalled();
    expect(mocks.snapshot).toHaveBeenCalledWith("room-a", "2026-06");
  });

  it("reads entries once and preserves departed members in settlement only", async () => {
    mocks.entries.mockResolvedValue([
      {
        id: "bill",
        currency: "USD",
        amountMinor: 1001,
        status: "published",
        paidByMembershipId: "departed",
      },
      {
        id: "draft",
        currency: "USD",
        amountMinor: 10000,
        status: "draft",
        paidByMembershipId: "active",
      },
    ]);
    const weights = [
      { entryId: "bill", membershipId: "active", weightBps: 5000 },
      { entryId: "bill", membershipId: "departed", weightBps: 5000 },
    ];
    mocks.weights.mockResolvedValue(weights);
    const response = await overview();
    expect(response.data?.entries[0]?.weights).toEqual(weights);
    expect(response.data?.entries[1]?.weights).toEqual([]);
    expect(response.data?.members.map((member) => member.id)).toEqual(["active"]);
    expect(response.data?.settlement.usd.suggestTransfer).toEqual([
      {
        fromMembershipId: "active",
        toMembershipId: "departed",
        fromName: "Alex",
        toName: "Sam",
        amountMinor: 501,
      },
    ]);
    expect(mocks.entries).toHaveBeenCalledTimes(1);
    expect(mocks.weights).toHaveBeenCalledTimes(1);
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });

  it("keeps an existing closed snapshot", async () => {
    const snapshot = { id: "snapshot", roomId: "room-a", yyyymm: "2026-06", status: "closed" };
    mocks.snapshot.mockResolvedValue(snapshot);
    expect((await overview()).data?.snapshot).toBe(snapshot);
  });

  it("defaults to the current ICT month", async () => {
    await overview({});
    expect(mocks.snapshot).toHaveBeenCalledWith("room-a", "2026-06");
  });

  it.each(["2026-13", "2026-00", "2026-6", "invalid", ["2026-06"]])(
    "rejects invalid month %s before data reads",
    async (month) => {
      await expect(overview({ month })).rejects.toThrow();
      expect(mocks.entries).not.toHaveBeenCalled();
      expect(mocks.select).not.toHaveBeenCalled();
    },
  );

  it.each([401, 403, 404])(
    "propagates access rejection %i before data reads",
    async (statusCode) => {
      mocks.context.mockRejectedValue(Object.assign(new Error("Access denied"), { statusCode }));
      await expect(overview()).rejects.toMatchObject({ statusCode });
      expect(mocks.entries).not.toHaveBeenCalled();
      expect(mocks.select).not.toHaveBeenCalled();
      expect(mocks.snapshot).not.toHaveBeenCalled();
    },
  );

  it("restricts entries to the requested room and half-open ICT month", async () => {
    await overview();
    const operators = {
      eq: (column: string, value: unknown) => ({ eq: [column, value] }),
      gte: (column: string, value: Date) => ({ gte: [column, value.toISOString()] }),
      lt: (column: string, value: Date) => ({ lt: [column, value.toISOString()] }),
      and: (...conditions: unknown[]) => conditions,
    };
    const condition = mocks.entries.mock.calls[0]![0].where(
      { roomId: "room", date: "date" },
      operators,
    );
    expect(condition).toEqual([
      { eq: ["room", "room-a"] },
      { gte: ["date", "2026-05-31T17:00:00.000Z"] },
      { lt: ["date", "2026-06-30T17:00:00.000Z"] },
    ]);
  });
});
