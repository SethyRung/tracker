import { describe, expect, it } from "vitest";
import {
  BPS_TOTAL,
  bpsToPercent,
  equalSplitBps,
  isValidWeights,
  percentToBps,
  splitRemainderBps,
  validateWeights,
} from "../../shared/types/weight";

describe("weight", () => {
  describe("bpsToPercent", () => {
    it("converts 10000 bps to 100", () => {
      expect(bpsToPercent(BPS_TOTAL)).toBe(100);
    });

    it("converts 2500 bps to 25", () => {
      expect(bpsToPercent(2500)).toBe(25);
    });

    it("converts 0 bps to 0", () => {
      expect(bpsToPercent(0)).toBe(0);
    });
  });

  describe("percentToBps", () => {
    it("converts 100 percent to 10000 bps", () => {
      expect(percentToBps(100)).toBe(10000);
    });

    it("converts 25 percent to 2500 bps", () => {
      expect(percentToBps(25)).toBe(2500);
    });

    it("rounds to nearest integer", () => {
      expect(percentToBps(33.333)).toBe(3333);
      expect(percentToBps(33.335)).toBe(3334);
    });
  });

  describe("validateWeights", () => {
    it("returns empty for a valid equal split", () => {
      const weights = { m1: 5000, m2: 5000 };
      expect(validateWeights(weights)).toEqual([]);
    });

    it("returns empty for a 3-way unequal split summing to 10000", () => {
      expect(validateWeights({ m1: 5000, m2: 3000, m3: 2000 })).toEqual([]);
    });

    it("returns empty for zero-weight attendees (still sums to 10000)", () => {
      expect(validateWeights({ m1: 7000, m2: 3000, m3: 0 })).toEqual([]);
    });

    it("flags sum_mismatch when total is not 10000", () => {
      const issues = validateWeights({ m1: 5000, m2: 4000 });
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("sum_mismatch");
      expect(issues[0].details).toEqual({ total: 9000, expected: 10000 });
    });

    it("flags out_of_range for negative weights", () => {
      const issues = validateWeights({ m1: -100, m2: 10100 });
      expect(issues).toHaveLength(2);
      expect(issues.every((i) => i.code === "out_of_range")).toBe(true);
    });

    it("flags out_of_range for weights > 10000", () => {
      const issues = validateWeights({ m1: 10001, m2: 9999 });
      expect(issues[0].code).toBe("out_of_range");
    });

    it("flags out_of_range for non-integer weights", () => {
      const issues = validateWeights({ m1: 5000.5, m2: 4999.5 });
      expect(issues[0].code).toBe("out_of_range");
    });

    it("returns empty for single-member 100%", () => {
      expect(validateWeights({ m1: 10000 })).toEqual([]);
    });

    it("flags empty for zero attendees", () => {
      const issues = validateWeights({});
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("empty");
    });
  });

  describe("isValidWeights", () => {
    it("returns true for valid weights", () => {
      expect(isValidWeights({ m1: 5000, m2: 5000 })).toBe(true);
    });

    it("returns false for invalid weights", () => {
      expect(isValidWeights({ m1: 5000, m2: 4000 })).toBe(false);
      expect(isValidWeights({})).toBe(false);
    });
  });

  describe("equalSplitBps", () => {
    it("returns 5000 for 2 attendees", () => {
      expect(equalSplitBps(2)).toBe(5000);
    });

    it("returns 3333 for 3 attendees (floor)", () => {
      expect(equalSplitBps(3)).toBe(3333);
    });

    it("returns 0 for 0 attendees", () => {
      expect(equalSplitBps(0)).toBe(0);
    });
  });

  describe("splitRemainderBps", () => {
    it("returns 0 for 2 attendees (10000 / 2 = 5000 exactly)", () => {
      expect(splitRemainderBps(2)).toBe(0);
    });

    it("returns 1 for 3 attendees (10000 - 3333*3 = 1)", () => {
      expect(splitRemainderBps(3)).toBe(1);
    });

    it("returns 0 for 0 attendees", () => {
      expect(splitRemainderBps(0)).toBe(0);
    });

    it("returns the missing bps for 7 attendees", () => {
      expect(splitRemainderBps(7)).toBe(10000 - 1428 * 7);
    });
  });
});
