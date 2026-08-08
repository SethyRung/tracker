import { describe, expect, it } from "vitest";
import { formatMoney, isValidCurrency } from "../../shared/types/money";

describe("money", () => {
  describe("formatMoney", () => {
    it("formats USD with two decimals and thousands separator", () => {
      expect(formatMoney({ amount_minor: 123456, currency: "USD" })).toBe("$1,234.56");
    });

    it("formats USD with leading zero cents", () => {
      expect(formatMoney({ amount_minor: 100, currency: "USD" })).toBe("$1.00");
      expect(formatMoney({ amount_minor: 105, currency: "USD" })).toBe("$1.05");
    });

    it("formats USD zero", () => {
      expect(formatMoney({ amount_minor: 0, currency: "USD" })).toBe("$0.00");
    });

    it("formats KHR with thousands separator and no decimals", () => {
      expect(formatMoney({ amount_minor: 1234567, currency: "KHR" })).toBe("៛1,234,567");
    });

    it("formats KHR zero", () => {
      expect(formatMoney({ amount_minor: 0, currency: "KHR" })).toBe("៛0");
    });

    it("formats negative USD with leading minus", () => {
      expect(formatMoney({ amount_minor: -123456, currency: "USD" })).toBe("-$1,234.56");
    });

    it("formats negative KHR with leading minus (consistent with USD)", () => {
      expect(formatMoney({ amount_minor: -5000, currency: "KHR" })).toBe("-៛5,000");
    });

    it("handles very large KHR amounts without float drift", () => {
      // oxlint-disable-next-line no-loss-of-precision
      const huge = 9007199254740993;
      expect(formatMoney({ amount_minor: huge, currency: "KHR" })).toBe(
        `៛${huge.toLocaleString("en-US")}`,
      );
    });
  });

  describe("isValidCurrency", () => {
    it("accepts USD and KHR", () => {
      expect(isValidCurrency("USD")).toBe(true);
      expect(isValidCurrency("KHR")).toBe(true);
    });

    it("rejects other values", () => {
      expect(isValidCurrency("usd")).toBe(false);
      expect(isValidCurrency("EUR")).toBe(false);
      expect(isValidCurrency("")).toBe(false);
      expect(isValidCurrency(null)).toBe(false);
      expect(isValidCurrency(undefined)).toBe(false);
      expect(isValidCurrency(42)).toBe(false);
    });
  });
});
