import { describe, expect, it } from "vitest";
import { pickNextAdmin } from "../../shared/utils/admin-succession";

const member = (id: string, joinedAt: Date) => ({ id, joinedAt });

describe("admin succession", () => {
  it("returns null when no members remain", () => {
    expect(pickNextAdmin([])).toBeNull();
  });

  it("picks the single remaining member", () => {
    const only = member("m1", new Date("2026-08-01T00:00:00Z"));
    expect(pickNextAdmin([only])).toEqual(only);
  });

  it("picks the oldest by joined_at", () => {
    const newer = member("m-new", new Date("2026-08-10T00:00:00Z"));
    const middle = member("m-mid", new Date("2026-08-05T00:00:00Z"));
    const oldest = member("m-old", new Date("2026-08-01T00:00:00Z"));
    expect(pickNextAdmin([newer, middle, oldest])).toEqual(oldest);
  });

  it("does not depend on order — oldest wins regardless of input order", () => {
    const oldest = member("m-old", new Date("2026-08-01T00:00:00Z"));
    const middle = member("m-mid", new Date("2026-08-05T00:00:00Z"));
    const newest = member("m-new", new Date("2026-08-10T00:00:00Z"));
    expect(pickNextAdmin([newest, oldest, middle])?.id).toBe("m-old");
    expect(pickNextAdmin([middle, newest, oldest])?.id).toBe("m-old");
  });

  it("on a tie, picks the first one encountered (stable)", () => {
    const sameTime = new Date("2026-08-01T00:00:00Z");
    const a = member("m-a", sameTime);
    const b = member("m-b", sameTime);
    expect(pickNextAdmin([a, b])?.id).toBe("m-a");
  });

  it("handles two members with the same joined_at and different ones before", () => {
    const older = member("older", new Date("2026-07-01T00:00:00Z"));
    const tiedA = member("tied-a", new Date("2026-08-01T00:00:00Z"));
    const tiedB = member("tied-b", new Date("2026-08-01T00:00:00Z"));
    expect(pickNextAdmin([tiedA, tiedB, older])).toEqual(older);
  });
});
