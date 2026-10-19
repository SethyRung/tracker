import { describe, expect, it } from "vitest";
import { splitLabel } from "../../shared/utils/split-label";

const names: Record<string, string> = {
  a: "Seth",
  b: "Ly",
  c: "Pich",
  d: "Dara",
};

function label(weights: Array<{ membershipId: string; weightBps: number }>) {
  return splitLabel(weights, (id) => names[id] ?? "—");
}

describe("splitLabel", () => {
  it("returns a dash when nobody is on the bill", () => {
    expect(label([])).toBe("—");
  });

  it("names the only attendee", () => {
    expect(label([{ membershipId: "a", weightBps: 10000 }])).toBe("Seth (100%)");
  });

  it("names both people even when the split is equal", () => {
    expect(
      label([
        { membershipId: "a", weightBps: 5000 },
        { membershipId: "b", weightBps: 5000 },
      ]),
    ).toBe("Seth & Ly (50/50)");
  });

  it("keeps an uneven pair as a ratio", () => {
    expect(
      label([
        { membershipId: "a", weightBps: 7000 },
        { membershipId: "b", weightBps: 3000 },
      ]),
    ).toBe("Seth & Ly (70/30)");
  });

  it("calls a 3+ equal split equal", () => {
    expect(
      label([
        { membershipId: "a", weightBps: 2500 },
        { membershipId: "b", weightBps: 2500 },
        { membershipId: "c", weightBps: 2500 },
        { membershipId: "d", weightBps: 2500 },
      ]),
    ).toBe("Equal (25% each)");
  });

  it("treats a 1bp remainder as equal", () => {
    expect(
      label([
        { membershipId: "a", weightBps: 3334 },
        { membershipId: "b", weightBps: 3333 },
        { membershipId: "c", weightBps: 3333 },
      ]),
    ).toBe("Equal (33% each)");
  });
});
