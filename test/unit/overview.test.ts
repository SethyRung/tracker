import { describe, expect, it } from "vitest";
import {
  buildOverviewSettlement,
  overviewCsv,
  summarizeOverviewEntries,
} from "../../shared/utils/overview";
import { settle } from "../../shared/utils/settle";

describe("summarizeOverviewEntries", () => {
  it("keeps the two ledgers separate and excludes drafts", () => {
    expect(
      summarizeOverviewEntries([
        { currency: "USD", amountMinor: 1001, status: "published" },
        { currency: "USD", amountMinor: 202, status: "published" },
        { currency: "KHR", amountMinor: 120000, status: "published" },
        { currency: "USD", amountMinor: 9999, status: "draft" },
        { currency: "KHR", amountMinor: 50000, status: "draft" },
      ]),
    ).toEqual({
      USD: { amountMinor: 1203, count: 2 },
      KHR: { amountMinor: 120000, count: 1 },
    });
  });

  it("returns zero totals for an empty month", () => {
    expect(summarizeOverviewEntries([])).toEqual({
      USD: { amountMinor: 0, count: 0 },
      KHR: { amountMinor: 0, count: 0 },
    });
  });
});

describe("buildOverviewSettlement", () => {
  const members = [
    {
      id: "a",
      nickname: "Alex",
      userName: "Alex Smith",
      joinedAt: new Date("2026-01-01"),
      leftAt: null,
    },
    {
      id: "b",
      nickname: null,
      userName: "Sam",
      joinedAt: new Date("2026-01-02"),
      leftAt: new Date("2026-06-15"),
    },
  ];
  const entry = {
    currency: "USD" as const,
    status: "published" as const,
    amountMinor: 1001,
    paidByMembershipId: "b",
    weights: [
      { membershipId: "a", weightBps: 5000 },
      { membershipId: "b", weightBps: 5000 },
    ],
  };

  it("uses the same integer balances as settlement, including departed members", () => {
    const result = buildOverviewSettlement([entry], members);
    const expected = settle([entry], members);
    expect(result.usd.members).toEqual(
      expected.balances.map((b) => ({ membershipId: b.membershipId, balance: b.net })),
    );
    expect(result.usd.suggestTransfer).toEqual([
      {
        fromMembershipId: "a",
        toMembershipId: "b",
        amountMinor: 501,
        fromName: "Alex",
        toName: "Sam",
      },
    ]);
  });

  it("keeps opposing currency balances separate", () => {
    const result = buildOverviewSettlement(
      [entry, { ...entry, currency: "KHR", amountMinor: 120000, paidByMembershipId: "a" }],
      members,
    );
    expect(result.usd.currency).toBe("USD");
    expect(result.khr.currency).toBe("KHR");
    expect(result.usd.members.find((m) => m.membershipId === "a")?.balance).toBe(-501);
    expect(result.khr.members.find((m) => m.membershipId === "a")?.balance).toBe(60000);
    expect(result.khr.suggestTransfer[0]).toMatchObject({
      fromMembershipId: "b",
      toMembershipId: "a",
      amountMinor: 60000,
    });
  });

  it("excludes drafts from both ledgers", () => {
    expect(
      buildOverviewSettlement(
        [
          { ...entry, status: "draft" },
          { ...entry, currency: "KHR", status: "draft" },
        ],
        members,
      ),
    ).toEqual(buildOverviewSettlement([], members));
  });

  it("returns zero balances and no transfers for an empty month", () => {
    const result = buildOverviewSettlement([], members);
    for (const plan of [result.usd, result.khr]) {
      expect(plan.members).toEqual([
        { membershipId: "a", balance: 0 },
        { membershipId: "b", balance: 0 },
      ]);
      expect(plan.suggestTransfer).toEqual([]);
    }
  });
});

const bill = {
  date: "2026-05-31T18:00:00.000Z",
  description: 'Rent, "June"\nApartment 4B',
  category: "Rent",
  paidBy: "Alex",
  currency: "USD" as const,
  amountMinor: 45001,
  status: "published" as const,
};

describe("overviewCsv", () => {
  it("exports ICT dates, escaped text, and integer minor units", () => {
    const csv = overviewCsv([bill]);
    expect(csv).toContain('"Date (Asia/Phnom_Penh)"');
    expect(csv).toContain('"Amount (minor units)"');
    expect(csv).toContain(
      '"2026-06-01","Rent, ""June""\nApartment 4B","Rent","Alex","USD","45001","published"',
    );
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", " \t=1+1", "\r=1+1"])(
    "neutralizes spreadsheet formulas: %s",
    (description) => {
      expect(overviewCsv([{ ...bill, description }])).toContain(`"'${description}"`);
    },
  );

  it("retains currency and draft status without conversion", () => {
    const csv = overviewCsv([{ ...bill, currency: "KHR", amountMinor: 1800000, status: "draft" }]);
    expect(csv).toContain('"KHR","1800000","draft"');
  });

  it("returns only headers when no bills exist", () => {
    expect(overviewCsv([]).split("\r\n")).toHaveLength(1);
  });
});
