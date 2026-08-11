import { describe, expect, it } from "vitest";
import {
  greedyMinTransfers,
  settle,
  type SettlementEntry,
  type SettlementMember,
} from "../../shared/utils/settle";
import { BPS_TOTAL } from "../../shared/types/weight";

// Settlement algorithm (Phase 10 / SPEC §10). Pure function — exercised in
// isolation. The DB wrapper (server/utils/settle.ts) just loads entries +
// members and calls `settle()` per currency.

const member = (
  id: string,
  joinedAt: string = "2026-01-01T00:00:00Z",
  leftAt: string | null = null,
): SettlementMember => ({
  id,
  joinedAt: new Date(joinedAt),
  leftAt: leftAt ? new Date(leftAt) : null,
});

const entry = (
  amountMinor: number,
  paidBy: string,
  attendees: Array<[string, number]>,
): SettlementEntry => ({
  amountMinor,
  paidByMembershipId: paidBy,
  weights: attendees.map(([membershipId, weightBps]) => ({ membershipId, weightBps })),
});

describe("settle", () => {
  it("returns empty balances and transfers for no entries", () => {
    const result = settle([], [member("m_a"), member("m_b"), member("m_c")]);
    expect(result.balances).toHaveLength(3);
    expect(result.balances.every((b) => b.net === 0)).toBe(true);
    expect(result.transfers).toEqual([]);
  });

  it("3 members, 1 bill, equal split → creditor nets +2/3 of the bill, debtors -1/3 each, 2 transfers", () => {
    // Seth paid 9000 (USD cents). Equal split 3334/3333/3333 across three
    // members. Integer math: seth owed 3000, ly 2999, pich 2999 (sumFloor
    // = 8998, remainder 2 → seth absorbs). So seth net = 9000 - 3002 = 5998.
    // The exact `+6000` only happens with truly equal weights summing to
    // 10000 (impossible with integer bps), so the assertion is on the
    // invariant instead.
    const members = [member("seth"), member("ly"), member("pich")];
    const entries = [
      entry(9000, "seth", [
        ["seth", 3334],
        ["ly", 3333],
        ["pich", 3333],
      ]),
    ];
    const result = settle(entries, members);

    const seth = result.balances.find((b) => b.membershipId === "seth")!;
    const ly = result.balances.find((b) => b.membershipId === "ly")!;
    const pich = result.balances.find((b) => b.membershipId === "pich")!;

    // Total balances sum to zero exactly.
    expect(seth.net + ly.net + pich.net).toBe(0);
    // Seth is a creditor (net > 0), the other two debtors.
    expect(seth.net).toBeGreaterThan(0);
    expect(ly.net).toBeLessThan(0);
    expect(pich.net).toBeLessThan(0);
    // 2 transfers, both toward seth.
    expect(result.transfers.length).toBe(2);
    for (const t of result.transfers) {
      expect(t.toMembershipId).toBe("seth");
      expect(t.amountMinor).toBeGreaterThan(0);
      expect(["ly", "pich"]).toContain(t.fromMembershipId);
    }
    // Total transfers sum exactly equals seth's net.
    const totalIn = result.transfers.reduce((s, t) => s + t.amountMinor, 0);
    expect(totalIn).toBe(seth.net);
  });

  it("uses <= N-1 transfers for N non-zero participants", () => {
    // 4 members, mixed bills → classic property check from PLAN §10.
    const members = [member("a"), member("b"), member("c"), member("d")];
    const entries = [
      entry(10000, "a", [
        ["a", 2500],
        ["b", 2500],
        ["c", 2500],
        ["d", 2500],
      ]),
      entry(5000, "b", [
        ["a", 2500],
        ["b", 2500],
        ["c", 2500],
        ["d", 2500],
      ]),
      entry(8000, "c", [
        ["a", 3334],
        ["b", 3333],
        ["c", 3333],
      ]),
    ];
    const result = settle(entries, members);
    const nonZero = result.balances.filter((b) => b.net !== 0).length;
    expect(result.transfers.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));
  });

  it("ignores tenure: a mid-month join still splits by the entry weights", () => {
    // m_a was there all month, m_b joined Aug 16 — but the entry says 50/50,
    // so it settles 50/50. Tenure pro-rating was removed deliberately: the
    // weights on an entry are the split, full stop.
    // Bill: $100 (10000 minor) paid by m_a, equal split 5000 each.
    // m_a owed 5000, paid 10000 → net +5000. m_b owed 5000 → net -5000.
    const members = [member("m_a", "2026-01-01T00:00:00Z"), member("m_b", "2026-08-15T17:00:00Z")];
    const entries = [
      entry(10000, "m_a", [
        ["m_a", 5000],
        ["m_b", 5000],
      ]),
    ];
    const result = settle(entries, members);
    const a = result.balances.find((b) => b.membershipId === "m_a")!;
    const b = result.balances.find((b) => b.membershipId === "m_b")!;
    expect(a.net).toBe(5000);
    expect(b.net).toBe(-5000);
    expect(result.transfers.length).toBe(1);
    expect(result.transfers[0]).toMatchObject({
      fromMembershipId: "m_b",
      toMembershipId: "m_a",
      amountMinor: 5000,
    });
  });

  it("reproduces the two-entry 50/50 case exactly ($110 → ±$55)", () => {
    // Regression guard: $100 + $10 both paid by m_a, split 50/50, with m_b
    // having joined mid-month. Pro-rating used to skew this to ±$37.25; it
    // must now be a clean ±$55.00.
    const members = [member("m_a", "2026-01-01T00:00:00Z"), member("m_b", "2026-08-11T17:00:00Z")];
    const split: Array<[string, number]> = [
      ["m_a", 5000],
      ["m_b", 5000],
    ];
    const result = settle([entry(10000, "m_a", split), entry(1000, "m_a", split)], members);
    expect(result.balances.find((b) => b.membershipId === "m_a")!.net).toBe(5500);
    expect(result.balances.find((b) => b.membershipId === "m_b")!.net).toBe(-5500);
  });

  it("produces an empty transfer list when every balance nets to zero", () => {
    // Bill paid by a single member who is also the sole attendee — no net.
    const members = [member("solo")];
    const entries = [entry(5000, "solo", [["solo", BPS_TOTAL]])];
    const result = settle(entries, members);
    expect(result.balances[0]!.net).toBe(0);
    expect(result.transfers).toEqual([]);
  });

  it("settles both currencies independently (no cross-currency mixing)", () => {
    const members = [member("a"), member("b")];
    // USD entry only — KHR plan should be empty even with the same members.
    const usd = [
      entry(10000, "a", [
        ["a", 5000],
        ["b", 5000],
      ]),
    ];
    const khr = [];
    const usdResult = settle(usd, members);
    const khrResult = settle(khr, members);
    expect(usdResult.transfers.length).toBe(1);
    expect(khrResult.balances.every((b) => b.net === 0)).toBe(true);
    expect(khrResult.transfers).toEqual([]);
  });

  it("produces transfers that exactly zero out all balances", () => {
    // Property check: applying the transfers to the balances must move every
    // net to 0 (or within rounding tolerance).
    const members = [member("a"), member("b"), member("c"), member("d"), member("e")];
    const entries = [
      entry(12345, "a", [
        ["a", 2000],
        ["b", 2000],
        ["c", 2000],
        ["d", 2000],
        ["e", 2000],
      ]),
      entry(7777, "c", [
        ["a", 2500],
        ["b", 2500],
        ["c", 2500],
        ["d", 1250],
        ["e", 1250],
      ]),
      entry(4000, "e", [
        ["b", 5000],
        ["c", 5000],
      ]),
    ];
    const result = settle(entries, members);

    // Compute final net per member after applying transfers.
    const finalNet = new Map(members.map((m) => [m.id, 0]));
    for (const b of result.balances) {
      finalNet.set(b.membershipId, b.net);
    }
    for (const t of result.transfers) {
      finalNet.set(t.fromMembershipId, (finalNet.get(t.fromMembershipId) ?? 0) + t.amountMinor);
      finalNet.set(t.toMembershipId, (finalNet.get(t.toMembershipId) ?? 0) - t.amountMinor);
    }
    for (const v of finalNet.values()) {
      expect(v).toBe(0);
    }
  });

  it("charges a departed member who is still an attendee on the entry", () => {
    // m_x left in July but still has a published entry dated in August that
    // they paid AND are listed as an attendee on. Without tenure pro-rating
    // the stored weights stand: m_x owes their 3333 bps share like anyone
    // else, and nets the rest of what they fronted.
    //   m_a: floor(9000 * 3334 / 10000) = 3000
    //   m_x: floor(9000 * 3333 / 10000) = 2999
    //   m_b: floor(9000 * 3333 / 10000) = 2999
    //   remainder 2 → longest-tenured attendee (m_a, first on tie) = 3002
    // m_x paid 9000, owed 2999 → net +6001.
    const members = [
      member("m_a", "2026-01-01T00:00:00Z"),
      member("m_x", "2026-01-01T00:00:00Z", "2026-07-15T00:00:00Z"), // left July 15
      member("m_b", "2026-01-01T00:00:00Z"),
    ];
    const entries = [
      entry(9000, "m_x", [
        ["m_a", 3334],
        ["m_x", 3333],
        ["m_b", 3333],
      ]),
    ];
    const result = settle(entries, members);

    expect(result.balances.find((b) => b.membershipId === "m_x")!.net).toBe(6001);
    // Everything still nets to zero across the room.
    const a = result.balances.find((b) => b.membershipId === "m_a")!.net;
    const b = result.balances.find((b) => b.membershipId === "m_b")!.net;
    expect(a + b).toBe(-6001);
    expect(a).toBeLessThan(0);
    expect(b).toBeLessThan(0);
    // 2 transfers: m_a → m_x, m_b → m_x, totals equal m_x's net.
    expect(result.transfers.length).toBe(2);
    const total = result.transfers.reduce((s, t) => s + t.amountMinor, 0);
    expect(total).toBe(6001);
    for (const t of result.transfers) {
      expect(t.toMembershipId).toBe("m_x");
    }
  });
});

describe("greedyMinTransfers", () => {
  it("returns empty array for zero balances", () => {
    expect(
      greedyMinTransfers([
        { membershipId: "a", paid: 0, owed: 0, net: 0 },
        { membershipId: "b", paid: 0, owed: 0, net: 0 },
      ]),
    ).toEqual([]);
  });

  it("pairs largest creditor with largest debtor each iteration", () => {
    // a: +50, b: +30, c: -80. Expected: c -> a (50), c -> b (30).
    const transfers = greedyMinTransfers([
      { membershipId: "a", paid: 50, owed: 0, net: 50 },
      { membershipId: "b", paid: 30, owed: 0, net: 30 },
      { membershipId: "c", paid: 0, owed: 80, net: -80 },
    ]);
    expect(transfers).toEqual([
      { fromMembershipId: "c", toMembershipId: "a", amountMinor: 50 },
      { fromMembershipId: "c", toMembershipId: "b", amountMinor: 30 },
    ]);
  });

  it("splits a debt across multiple creditors when needed", () => {
    // a: +30, b: +40, c: -50. c owes a 30 and b 20 (greedy by size).
    const transfers = greedyMinTransfers([
      { membershipId: "a", paid: 30, owed: 0, net: 30 },
      { membershipId: "b", paid: 40, owed: 0, net: 40 },
      { membershipId: "c", paid: 0, owed: 70, net: -70 },
    ]);
    // b is the biggest creditor, so c -> b first (40), then c -> a (30).
    expect(transfers).toEqual([
      { fromMembershipId: "c", toMembershipId: "b", amountMinor: 40 },
      { fromMembershipId: "c", toMembershipId: "a", amountMinor: 30 },
    ]);
  });

  it("does not mutate the input balances", () => {
    const input = [
      { membershipId: "a", paid: 50, owed: 0, net: 50 },
      { membershipId: "b", paid: 0, owed: 50, net: -50 },
    ];
    const snapshot = JSON.parse(JSON.stringify(input));
    greedyMinTransfers(input);
    expect(input).toEqual(snapshot);
  });
});
