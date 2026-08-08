import { describe, expect, it } from "vitest";
import {
  attendanceSchema,
  currencySchema,
  moneySchema,
  monthKeySchema,
  sharePercentSchema,
  weightEntrySchema,
} from "../../shared/types/schemas";

describe("schemas", () => {
  describe("currencySchema", () => {
    it("accepts USD and KHR", () => {
      expect(currencySchema.parse("USD")).toBe("USD");
      expect(currencySchema.parse("KHR")).toBe("KHR");
    });

    it("rejects unknown currencies", () => {
      expect(() => currencySchema.parse("EUR")).toThrow();
      expect(() => currencySchema.parse("")).toThrow();
    });
  });

  describe("moneySchema", () => {
    it("accepts a valid Money object", () => {
      expect(moneySchema.parse({ amount_minor: 1000, currency: "USD" })).toEqual({
        amount_minor: 1000,
        currency: "USD",
      });
    });

    it("rejects negative amounts", () => {
      expect(() => moneySchema.parse({ amount_minor: -1, currency: "USD" })).toThrow();
    });

    it("rejects non-integer amounts", () => {
      expect(() => moneySchema.parse({ amount_minor: 1.5, currency: "USD" })).toThrow();
    });

    it("rejects unknown currency", () => {
      expect(() => moneySchema.parse({ amount_minor: 100, currency: "EUR" })).toThrow();
    });
  });

  describe("monthKeySchema", () => {
    it("accepts YYYY-MM", () => {
      expect(monthKeySchema.parse("2026-08")).toBe("2026-08");
    });

    it("rejects wrong formats", () => {
      expect(() => monthKeySchema.parse("2026-13")).toThrow();
      expect(() => monthKeySchema.parse("not-a-month")).toThrow();
      expect(() => monthKeySchema.parse("2026/08")).toThrow();
    });
  });

  describe("weightEntrySchema", () => {
    it("accepts a valid entry", () => {
      expect(weightEntrySchema.parse({ membership_id: "m1", weight_bps: 5000 })).toEqual({
        membership_id: "m1",
        weight_bps: 5000,
      });
    });

    it("rejects out-of-range weights", () => {
      expect(() => weightEntrySchema.parse({ membership_id: "m1", weight_bps: -1 })).toThrow();
      expect(() => weightEntrySchema.parse({ membership_id: "m1", weight_bps: 10001 })).toThrow();
    });

    it("rejects empty membership_id", () => {
      expect(() => weightEntrySchema.parse({ membership_id: "", weight_bps: 5000 })).toThrow();
    });
  });

  describe("attendanceSchema", () => {
    it("accepts a single-attendee 100% entry", () => {
      expect(attendanceSchema.parse([{ membership_id: "m1", weight_bps: 10000 }])).toEqual([
        { membership_id: "m1", weight_bps: 10000 },
      ]);
    });

    it("accepts a balanced split", () => {
      expect(
        attendanceSchema.parse([
          { membership_id: "m1", weight_bps: 5000 },
          { membership_id: "m2", weight_bps: 5000 },
        ]),
      ).toHaveLength(2);
    });

    it("rejects empty attendance", () => {
      expect(() => attendanceSchema.parse([])).toThrow();
    });

    it("rejects sum != 10000", () => {
      const result = attendanceSchema.safeParse([
        { membership_id: "m1", weight_bps: 5000 },
        { membership_id: "m2", weight_bps: 4000 },
      ]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.code === "custom")).toBe(true);
      }
    });

    it("rejects duplicate attendees", () => {
      const result = attendanceSchema.safeParse([
        { membership_id: "m1", weight_bps: 5000 },
        { membership_id: "m1", weight_bps: 5000 },
      ]);
      expect(result.success).toBe(false);
    });
  });

  describe("sharePercentSchema", () => {
    it("accepts 0–100", () => {
      expect(sharePercentSchema.parse(0)).toBe(0);
      expect(sharePercentSchema.parse(100)).toBe(100);
      expect(sharePercentSchema.parse(25.5)).toBe(25.5);
    });

    it("rejects out-of-range values", () => {
      expect(() => sharePercentSchema.parse(-1)).toThrow();
      expect(() => sharePercentSchema.parse(101)).toThrow();
    });
  });
});
