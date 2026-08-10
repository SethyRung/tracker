import { describe, expect, it } from "vitest";
import {
  bpsToPercent,
  equalSplitBps,
  isValidWeights,
  percentToBps,
  splitRemainderBps,
  validateWeights,
} from "../../shared/types/weight";

// Share weights are decimals in [0, 1] (0.45 = 45%). 1.0 represents 100%.

describe("weight", () => {
  describe("bpsToPercent", () => {
    it("converts 1 to 100", () => {
      expect(bpsToPercent(1)).toBe(100);
    });

    it("converts 0.25 to 25", () => {
      expect(bpsToPercent(0.25)).toBe(25);
    });

    it("converts 0 to 0", () => {
      expect(bpsToPercent(0)).toBe(0);
    });
  });

  describe("percentToBps", () => {
    it("converts 100 percent to 1", () => {
      expect(percentToBps(100)).toBe(1);
    });

    it("converts 25 percent to 0.25", () => {
      expect(percentToBps(25)).toBe(0.25);
    });

    it("rounds to 4 decimal places", () => {
      expect(percentToBps(33.333)).toBe(0.3333);
      expect(percentToBps(33.335)).toBe(0.3334);
    });
  });

  describe("validateWeights", () => {
    it("returns empty for a valid equal split", () => {
      const weights = { m1: 0.5, m2: 0.5 };
      expect(validateWeights(weights)).toEqual([]);
    });

    it("returns empty for a 3-way unequal split summing to 1", () => {
      expect(validateWeights({ m1: 0.5, m2: 0.3, m3: 0.2 })).toEqual([]);
    });

    it("returns empty for zero-weight attendees (still sums to 1)", () => {
      expect(validateWeights({ m1: 0.7, m2: 0.3, m3: 0 })).toEqual([]);
    });

    it("flags sum_mismatch when total is not 1", () => {
      const issues = validateWeights({ m1: 0.5, m2: 0.4 });
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("sum_mismatch");
      expect(issues[0].details).toEqual({ total: 0.9, expected: 1 });
    });

    it("flags out_of_range for negative weights", () => {
      const issues = validateWeights({ m1: -0.1, m2: 1.1 });
      expect(issues).toHaveLength(2);
      expect(issues.every((i) => i.code === "out_of_range")).toBe(true);
    });

    it("flags out_of_range for weights > 1", () => {
      const issues = validateWeights({ m1: 1.01, m2: 0.99 });
      expect(issues[0].code).toBe("out_of_range");
    });

    it("returns empty for single-member 100%", () => {
      expect(validateWeights({ m1: 1 })).toEqual([]);
    });

    it("flags empty for zero attendees", () => {
      const issues = validateWeights({});
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("empty");
    });
  });

  describe("isValidWeights", () => {
    it("returns true for valid weights", () => {
      expect(isValidWeights({ m1: 0.5, m2: 0.5 })).toBe(true);
    });

    it("returns false for invalid weights", () => {
      expect(isValidWeights({ m1: 0.5, m2: 0.4 })).toBe(false);
      expect(isValidWeights({})).toBe(false);
    });
  });

  describe("equalSplitBps", () => {
    it("returns 0.5 for 2 attendees", () => {
      expect(equalSplitBps(2)).toBe(0.5);
    });

    it("returns 0.3333 for 3 attendees (floor at 4 decimals)", () => {
      expect(equalSplitBps(3)).toBe(0.3333);
    });

    it("returns 0 for 0 attendees", () => {
      expect(equalSplitBps(0)).toBe(0);
    });
  });

  describe("splitRemainderBps", () => {
    it("returns 0 for 2 attendees (1 / 2 = 0.5 exactly)", () => {
      expect(splitRemainderBps(2)).toBe(0);
    });

    it("returns 0.0001 for 3 attendees (1 - 0.3333*3 = 0.0001)", () => {
      expect(splitRemainderBps(3)).toBe(0.0001);
    });

    it("returns 0 for 0 attendees", () => {
      expect(splitRemainderBps(0)).toBe(0);
    });

    it("returns the missing decimal for 7 attendees", () => {
      expect(splitRemainderBps(7)).toBeCloseTo(1 - 0.1428 * 7, 5);
    });
  });
});
