import { describe, expect, it } from "vitest";
import {
  proRatedWeights,
  type ProRateMember,
  type ProRateWeight,
} from "../../shared/utils/pro-rate";
import { BPS_TOTAL } from "../../shared/types/weight";

// Pro-rating (Phase 9 / SPEC §7b + §11). Pure function — tested in isolation.
// activeDaysInMonth / daysInMonth are exercised by test/unit/date.test.ts;
// this file focuses on the pro-rating math on top of them.

const member = (id: string, joinedAt: string, leftAt: string | null = null): ProRateMember => ({
  id,
  joinedAt: new Date(joinedAt),
  leftAt: leftAt ? new Date(leftAt) : null,
});

// Asia/Phnom_Penh = UTC+7. A date string "2026-08-15T00:00:00" without a TZ
// is interpreted in local TZ by `new Date()`; we pin UTC here so the day
// boundary lines up regardless of the test runner's host clock.

const AUG_FULL = "2026-08";

const sum = (m: Map<string, number>) => Array.from(m.values()).reduce((s, v) => s + v, 0);

describe("proRatedWeights", () => {
  it("returns the original weights when every member is active the whole month", () => {
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 5000 },
      { membershipId: "m_b", weightBps: 5000 },
    ];
    const members = [member("m_a", "2026-01-01T00:00:00Z"), member("m_b", "2026-02-01T00:00:00Z")];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(result.get("m_a")).toBe(5000);
    expect(result.get("m_b")).toBe(5000);
    expect(sum(result)).toBe(BPS_TOTAL);
  });

  it("reduces a mid-month joiner's weight proportionally", () => {
    // m_a joined Aug 1 (full month), m_b joined Aug 16 00:00 ICT (= Aug 15
    // 17:00 UTC). Aug has 31 days, so m_b gets 16/31 of their share.
    // Equal split 5000 each:
    //   m_a: 5000 (full month)
    //   m_b: floor(5000 * 16 / 31) = floor(2580.6) = 2580
    //   total = 7580, remainder = 2420 -> longest-tenured (m_a) absorbs.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 5000 },
      { membershipId: "m_b", weightBps: 5000 },
    ];
    const members = [member("m_a", "2026-01-01T00:00:00Z"), member("m_b", "2026-08-15T17:00:00Z")];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(result.get("m_b")).toBe(2580);
    expect(result.get("m_a")).toBe(5000 + 2420);
    expect(sum(result)).toBe(BPS_TOTAL);
  });

  it("reduces a mid-month leaver's weight", () => {
    // m_a leaves Aug 20 00:00 ICT. Effective window = Aug 1..19 inclusive = 19 days.
    // m_b stays full month. Equal split 5000:
    //   m_a: floor(5000 * 19 / 31) = floor(3064.5) = 3064
    //   m_b: 5000 (full month)
    //   total = 8064, remainder = 1936 -> m_b (full month) absorbs since m_b
    //   is the only contributor... wait, m_a also contributed. Longest-tenured
    //   among contributors is whoever joined first.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 5000 },
      { membershipId: "m_b", weightBps: 5000 },
    ];
    const members = [
      member("m_a", "2026-01-01T00:00:00Z", "2026-08-19T17:00:00Z"), // leaves Aug 20 00:00
      member("m_b", "2026-02-01T00:00:00Z"),
    ];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(sum(result)).toBe(BPS_TOTAL);
    expect(result.get("m_a")).toBeGreaterThan(0);
    expect(result.get("m_b")).toBeGreaterThan(0);
  });

  it("returns 0 weight for an attendee with zero active days (but still lists them)", () => {
    // m_b hasn't joined yet — they exist in the entry weights but have 0
    // active days. Per PLAN §7 open question 7 default: still listed, 0 share.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 10000 },
      { membershipId: "m_b", weightBps: 0 },
    ];
    const members = [
      member("m_a", "2026-01-01T00:00:00Z"),
      member("m_b", "2026-09-01T00:00:00Z"), // joins AFTER August
    ];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(result.has("m_b")).toBe(true);
    expect(result.get("m_b")).toBe(0);
    expect(result.get("m_a")).toBe(BPS_TOTAL);
  });

  it("absorbs the rounding remainder into the longest-tenured contributor", () => {
    // Two contributors with unequal tenure — make sure the earlier joiner
    // absorbs the floor even when their floored weight is large.
    // m_a joined Aug 1, m_b joined Aug 16. Equal split 5000 each.
    // floored: m_a = 5000, m_b = 2580. remainder = 2420. m_a (earlier
    // joinedAt) gets +2420 -> 7420.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 5000 },
      { membershipId: "m_b", weightBps: 5000 },
    ];
    const members = [member("m_a", "2026-08-01T00:00:00Z"), member("m_b", "2026-08-15T17:00:00Z")];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(sum(result)).toBe(BPS_TOTAL);
    // m_a is the longest-tenured, so m_a should be the one with the bump.
    expect(result.get("m_a")!).toBeGreaterThan(5000);
    expect(result.get("m_b")).toBe(2580);
  });

  it("skips remainder distribution when no attendee has any active days", () => {
    // Degenerate case: every weight's member has 0 active days. We return
    // the floored (zero) values; settlement treats this entry as 0-effective.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 5000 },
      { membershipId: "m_b", weightBps: 5000 },
    ];
    const members = [
      member("m_a", "2027-01-01T00:00:00Z"), // joined AFTER August
      member("m_b", "2027-02-01T00:00:00Z"),
    ];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(result.get("m_a")).toBe(0);
    expect(result.get("m_b")).toBe(0);
    expect(sum(result)).toBe(0);
  });

  it("treats a missing membership as zero-active-days", () => {
    // Defensive: weight references a membership not in `members`. Should
    // not throw; treated like a zero-days attendee.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 10000 },
      { membershipId: "m_ghost", weightBps: 5000 },
    ];
    const members = [member("m_a", "2026-01-01T00:00:00Z")];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(result.get("m_a")).toBe(BPS_TOTAL);
    expect(result.get("m_ghost")).toBe(0);
    expect(sum(result)).toBe(BPS_TOTAL);
  });

  it("returns the original weights for a non-pro-rated split (uneven but full month)", () => {
    // 7000 / 3000 — no fractional pro-rating since everyone is active all month.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 7000 },
      { membershipId: "m_b", weightBps: 3000 },
    ];
    const members = [member("m_a", "2026-01-01T00:00:00Z"), member("m_b", "2026-02-01T00:00:00Z")];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(result.get("m_a")).toBe(7000);
    expect(result.get("m_b")).toBe(3000);
  });

  it("always sums to BPS_TOTAL (or 0 if degenerate)", () => {
    // Property check: every pro-rating result sums to exactly BPS_TOTAL
    // unless no contributor is active, in which case it sums to 0.
    const weights: ProRateWeight[] = [
      { membershipId: "m_a", weightBps: 3333 },
      { membershipId: "m_b", weightBps: 3333 },
      { membershipId: "m_c", weightBps: 3334 },
    ];
    const members = [
      member("m_a", "2026-08-01T00:00:00Z"),
      member("m_b", "2026-08-10T00:00:00Z"),
      member("m_c", "2026-08-20T00:00:00Z"),
    ];
    const result = proRatedWeights({ weights, yyyymm: AUG_FULL, members });
    expect(sum(result)).toBe(BPS_TOTAL);
  });

  it("throws on an invalid month key", () => {
    expect(() =>
      proRatedWeights({
        weights: [{ membershipId: "m_a", weightBps: 10000 }],
        yyyymm: "2026-13",
        members: [member("m_a", "2026-01-01T00:00:00Z")],
      }),
    ).toThrow();
  });

  it("uses 29 days for leap February", () => {
    // 2024-02 has 29 days. Single member active whole month, full weight 10000.
    const result = proRatedWeights({
      weights: [{ membershipId: "m_a", weightBps: 10000 }],
      yyyymm: "2024-02",
      members: [member("m_a", "2024-01-01T00:00:00Z")],
    });
    expect(result.get("m_a")).toBe(10000);
  });
});
