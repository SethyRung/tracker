import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { monthKey, monthRange } from "../../shared/utils/date";
import { ApiResponseCode } from "../../shared/types/response";

const mocks = vi.hoisted(() => ({
  category: vi.fn(),
  duplicate: vi.fn(),
  findEntry: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@nuxthub/db", () => ({
  db: {
    query: {
      categories: { findFirst: mocks.category },
      entries: { findFirst: mocks.duplicate },
    },
    update: mocks.update,
    insert: mocks.insert,
  },
  schema: { entries: { id: "id" }, entryWeights: {} },
}));

let update: typeof import("../../server/api/rooms/[id]/entries/[eid]/index.patch").default;
let create: typeof import("../../server/api/rooms/[id]/entries/index.post").default;
const entry = {
  id: "entry-a",
  categoryId: "food",
  date: new Date("2026-06-10T00:00:00Z"),
  status: "published",
};

beforeAll(async () => {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("getRoomId", () => "room-a");
  vi.stubGlobal("getEntryId", () => "entry-a");
  vi.stubGlobal("requireRoomContext", async () => ({ userId: "user-a" }));
  vi.stubGlobal("readValidatedBody", (event: { body: unknown }, parse: (body: unknown) => unknown) =>
    parse(event.body),
  );
  vi.stubGlobal("findRoomEntry", mocks.findEntry);
  vi.stubGlobal("findEntryWeights", async () => []);
  vi.stubGlobal("replaceEntryWeights", async () => {});
  vi.stubGlobal("canMutateEntry", () => true);
  vi.stubGlobal("closedMonthResponse", async () => null);
  vi.stubGlobal("areActiveAttendees", async () => true);
  vi.stubGlobal("newId", () => "new-entry");
  vi.stubGlobal("BPS_TOTAL", 10000);
  vi.stubGlobal("monthKey", monthKey);
  vi.stubGlobal("monthRange", monthRange);
  vi.stubGlobal("ApiResponseCode", ApiResponseCode);
  vi.stubGlobal("createResponse", (status: unknown, data?: unknown) => ({ status, data }));
  update = (await import("../../server/api/rooms/[id]/entries/[eid]/index.patch")).default;
  create = (await import("../../server/api/rooms/[id]/entries/index.post")).default;
});

afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findEntry.mockResolvedValue(entry);
  mocks.category.mockResolvedValue({ recurringType: "unlimited" });
  mocks.duplicate.mockResolvedValue(undefined);
  mocks.update.mockReturnValue({ set: () => ({ where: vi.fn().mockResolvedValue(undefined) }) });
  mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
});

function edit(body: Record<string, unknown>) {
  return update({ body } as never);
}

function add(categoryId: string) {
  return create({
    body: {
      categoryId,
      currency: "USD",
      amountMinor: 500,
      date: "2026-06-10T00:00:00Z",
      paidByMembershipId: "member-a",
      weights: [{ membershipId: "member-a", weightBps: 10000 }],
    },
  } as never);
}

describe("entry category rules", () => {
  it("rejects a change to a recurring category", async () => {
    mocks.category.mockResolvedValue({ recurringType: "recurring" });
    const response = await edit({ categoryId: "rent" });
    expect(response.status.code).toBe(ApiResponseCode.InvalidRequest);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows an existing recurring entry to retain its category", async () => {
    mocks.findEntry.mockResolvedValue({ ...entry, categoryId: "rent", templateId: "template-a" });
    mocks.category.mockResolvedValue({ recurringType: "recurring" });
    expect((await edit({ categoryId: "rent", amountMinor: 1000 })).status.code).toBe(
      ApiResponseCode.Success,
    );
  });

  it("rejects duplicate once-per-month categories, including after changing date", async () => {
    mocks.category.mockResolvedValue({ recurringType: "once" });
    mocks.duplicate.mockResolvedValue({ id: "entry-b" });
    const response = await edit({ categoryId: "utilities", date: "2026-07-01T00:00:00Z" });
    expect(response.status.code).toBe(ApiResponseCode.InvalidRequest);
    expect(mocks.update).not.toHaveBeenCalled();
    const where = mocks.duplicate.mock.calls[0]![0].where;
    const operators = {
      eq: (column: string, value: unknown) => ["eq", column, value],
      ne: (column: string, value: unknown) => ["ne", column, value],
      gte: (column: string, value: Date) => ["gte", column, value.toISOString()],
      lt: (column: string, value: Date) => ["lt", column, value.toISOString()],
      and: (...conditions: unknown[]) => conditions,
    };
    expect(where({ roomId: "room", categoryId: "category", id: "id", date: "date" }, operators))
      .toEqual([
        ["eq", "room", "room-a"],
        ["eq", "category", "utilities"],
        ["ne", "id", "entry-a"],
        ["gte", "date", "2026-06-30T17:00:00.000Z"],
        ["lt", "date", "2026-07-31T17:00:00.000Z"],
      ]);
  });

  it("allows a once-per-month category when no other entry uses it", async () => {
    mocks.category.mockResolvedValue({ recurringType: "once" });
    expect((await edit({ categoryId: "utilities" })).status.code).toBe(ApiResponseCode.Success);
  });

  it("checks the current category when only the date changes", async () => {
    mocks.findEntry.mockResolvedValue({ ...entry, categoryId: "utilities" });
    mocks.category.mockResolvedValue({ recurringType: "once" });
    mocks.duplicate.mockResolvedValue({ id: "entry-b" });
    expect((await edit({ date: "2026-07-01T00:00:00Z" })).status.code).toBe(
      ApiResponseCode.InvalidRequest,
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects creating a second once-per-month entry", async () => {
    mocks.category.mockResolvedValue({ recurringType: "once" });
    mocks.duplicate.mockResolvedValue({ id: "entry-b" });
    expect((await add("utilities")).status.code).toBe(ApiResponseCode.InvalidRequest);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects categories outside the room on create and edit", async () => {
    mocks.category.mockResolvedValue(undefined);
    expect((await edit({ categoryId: "other-room" })).status.code).toBe(ApiResponseCode.InvalidRequest);
    expect((await add("other-room")).status.code).toBe(ApiResponseCode.InvalidRequest);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects manually creating entries in recurring categories", async () => {
    mocks.category.mockResolvedValue({ recurringType: "recurring" });
    expect((await add("rent")).status.code).toBe(ApiResponseCode.InvalidRequest);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
