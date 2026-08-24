import { describe, expect, it } from "vitest";
import {
  canDeleteRoom,
  isPurgeEligible,
  isRoomActive,
  wasArchivedByRoomDelete,
} from "../../shared/utils/room-lifecycle";

describe("isRoomActive", () => {
  it("treats a room with a null deletedAt as live", () => {
    expect(isRoomActive({ deletedAt: null })).toBe(true);
  });

  it("treats a room with a deletedAt timestamp as not live", () => {
    expect(isRoomActive({ deletedAt: new Date("2026-08-01T00:00:00Z") })).toBe(false);
  });
});

const member = (id: string) => ({ id });

describe("canDeleteRoom", () => {
  it("refuses when no active members remain", () => {
    expect(canDeleteRoom([], "m-caller")).toBe(false);
  });

  it("allows the sole active member to delete, regardless of role", () => {
    expect(canDeleteRoom([member("m-caller")], "m-caller")).toBe(true);
  });

  it("refuses when another active member remains", () => {
    expect(canDeleteRoom([member("m-caller"), member("m-other")], "m-caller")).toBe(false);
  });

  it("refuses when the sole active member is not the caller", () => {
    expect(canDeleteRoom([member("m-other")], "m-caller")).toBe(false);
  });
});

const deletedAt = new Date("2026-08-15T12:00:00.000Z");
const toleranceMs = 2000;
const membership = (leftAt: Date | null) => ({ leftAt });

describe("wasArchivedByRoomDelete", () => {
  it("matches a membership that left at the room delete", () => {
    expect(wasArchivedByRoomDelete(membership(deletedAt), deletedAt, toleranceMs)).toBe(true);
  });

  it("does not match a membership that left before the delete", () => {
    const leftEarlier = new Date(deletedAt.getTime() - 60_000);
    expect(wasArchivedByRoomDelete(membership(leftEarlier), deletedAt, toleranceMs)).toBe(false);
  });

  it("matches every membership that shares the same leftAt at delete time", () => {
    const first = membership(new Date("2026-08-15T12:00:00.000Z"));
    const second = membership(new Date("2026-08-15T12:00:00.000Z"));
    expect(wasArchivedByRoomDelete(first, deletedAt, toleranceMs)).toBe(true);
    expect(wasArchivedByRoomDelete(second, deletedAt, toleranceMs)).toBe(true);
  });

  it("does not match a still-active membership or a live room", () => {
    expect(wasArchivedByRoomDelete(membership(null), deletedAt, toleranceMs)).toBe(false);
    expect(wasArchivedByRoomDelete(membership(deletedAt), null, toleranceMs)).toBe(false);
  });

  it("matches a leftAt within the tolerance window", () => {
    const justInside = new Date(deletedAt.getTime() - toleranceMs);
    expect(wasArchivedByRoomDelete(membership(justInside), deletedAt, toleranceMs)).toBe(true);
  });

  it("does not match a leftAt just outside the tolerance window", () => {
    const justOutside = new Date(deletedAt.getTime() - toleranceMs - 1);
    expect(wasArchivedByRoomDelete(membership(justOutside), deletedAt, toleranceMs)).toBe(false);
  });
});

const purgeDays = 30;
const now = new Date("2026-09-14T12:00:00.000Z");

describe("isPurgeEligible", () => {
  it("does not purge a room that is still live", () => {
    expect(isPurgeEligible({ deletedAt: null }, now, purgeDays)).toBe(false);
  });

  it("does not purge a room whose deletedAt is exactly at the 30-day boundary", () => {
    expect(
      isPurgeEligible({ deletedAt: new Date("2026-08-15T12:00:00.000Z") }, now, purgeDays),
    ).toBe(false);
  });

  it("does not purge a room deleted fewer than 30 days ago", () => {
    expect(
      isPurgeEligible({ deletedAt: new Date("2026-08-16T12:00:00.000Z") }, now, purgeDays),
    ).toBe(false);
  });

  it("purges a room deleted more than 30 days ago", () => {
    expect(
      isPurgeEligible({ deletedAt: new Date("2026-08-14T12:00:00.000Z") }, now, purgeDays),
    ).toBe(true);
  });
});
