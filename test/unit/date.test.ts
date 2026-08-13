import { describe, expect, it } from "vitest";
import {
  PHNOM_PENH_TZ,
  activeDaysInMonth,
  daysInMonth,
  isValidMonthKey,
  monthKey,
  monthRange,
} from "../../shared/utils/date";

describe("date", () => {
  describe("isValidMonthKey", () => {
    it("accepts well-formed YYYY-MM", () => {
      expect(isValidMonthKey("2026-08")).toBe(true);
      expect(isValidMonthKey("2026-01")).toBe(true);
      expect(isValidMonthKey("2026-12")).toBe(true);
    });

    it("rejects malformed keys", () => {
      expect(isValidMonthKey("2026-13")).toBe(false);
      expect(isValidMonthKey("2026-00")).toBe(false);
      expect(isValidMonthKey("2026-1")).toBe(false);
      expect(isValidMonthKey("2026/08")).toBe(false);
      expect(isValidMonthKey("26-08")).toBe(false);
      expect(isValidMonthKey("")).toBe(false);
      expect(isValidMonthKey(null)).toBe(false);
      expect(isValidMonthKey(undefined)).toBe(false);
      expect(isValidMonthKey(202608)).toBe(false);
    });
  });

  describe("monthKey", () => {
    it("returns the Phnom Penh month for a UTC instant", () => {
      const utc = new Date(Date.UTC(2026, 7, 31, 16, 59));
      expect(monthKey(utc)).toBe("2026-08");
    });

    it("handles UTC instants that are still in the previous Phnom Penh day", () => {
      const utc = new Date(Date.UTC(2026, 7, 31, 16, 59));
      expect(monthKey(utc)).toBe("2026-08");
    });

    it("flips to the next Phnom Penh month at 17:00 UTC", () => {
      const utc = new Date(Date.UTC(2026, 7, 31, 17, 1));
      expect(monthKey(utc)).toBe("2026-09");
    });
  });

  describe("monthRange", () => {
    it("returns start = month 1 00:00 ICT and end = next month 1 00:00 ICT", () => {
      const { start, end } = monthRange("2026-08");
      expect(start.toISOString()).toBe("2026-07-31T17:00:00.000Z");
      expect(end.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    });

    it("throws on invalid month key", () => {
      expect(() => monthRange("2026-13")).toThrow();
      expect(() => monthRange("nope")).toThrow();
    });
  });

  describe("daysInMonth", () => {
    it("returns 31 for August", () => {
      expect(daysInMonth("2026-08")).toBe(31);
    });

    it("returns 30 for September", () => {
      expect(daysInMonth("2026-09")).toBe(30);
    });

    it("returns 28 for non-leap February", () => {
      expect(daysInMonth("2026-02")).toBe(28);
    });

    it("returns 29 for leap February", () => {
      expect(daysInMonth("2024-02")).toBe(29);
    });

    it("returns 31 for December", () => {
      expect(daysInMonth("2026-12")).toBe(31);
    });
  });

  describe("activeDaysInMonth", () => {
    it("returns full month for member who joined on the 1st", () => {
      const joined = new Date(Date.UTC(2026, 6, 31, 17, 0));
      expect(activeDaysInMonth("2026-08", joined, null)).toBe(31);
    });

    it("returns 17 for a member who joined Aug 15 and was active all month", () => {
      const joined = new Date(Date.UTC(2026, 7, 14, 17, 0));
      expect(activeDaysInMonth("2026-08", joined, null)).toBe(17);
    });

    it("returns 1 for a member who joined at the very end of the month", () => {
      const joined = new Date(Date.UTC(2026, 7, 31, 12, 0));
      expect(activeDaysInMonth("2026-08", joined, null)).toBe(1);
    });

    it("counts days from joinedAt to leftAt inclusive", () => {
      const joined = new Date(Date.UTC(2026, 7, 14, 17, 0));
      const left = new Date(Date.UTC(2026, 7, 19, 17, 0));
      expect(activeDaysInMonth("2026-08", joined, left)).toBe(6);
    });

    it("returns 0 when joinedAt is after leftAt", () => {
      const joined = new Date(Date.UTC(2026, 8, 5, 0, 0));
      const left = new Date(Date.UTC(2026, 7, 20, 0, 0));
      expect(activeDaysInMonth("2026-08", joined, left)).toBe(0);
    });

    it("returns 0 when joinedAt is after month end", () => {
      const joined = new Date(Date.UTC(2026, 9, 1, 0, 0));
      expect(activeDaysInMonth("2026-08", joined, null)).toBe(0);
    });

    it("returns full month for member who joined in a previous month", () => {
      const joined = new Date(Date.UTC(2026, 0, 1, 0, 0));
      expect(activeDaysInMonth("2026-08", joined, null)).toBe(31);
    });

    it("caps end to the last day of the month when leftAt is missing", () => {
      const joined = new Date(Date.UTC(2026, 7, 14, 17, 0));
      expect(activeDaysInMonth("2026-08", joined, null)).toBe(17);
    });
  });

  describe("monthKey (current)", () => {
    it("returns the current Phnom Penh month", () => {
      expect(monthKey()).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe("PHNOM_PENH_TZ", () => {
    it("is set to Asia/Phnom_Penh", () => {
      expect(PHNOM_PENH_TZ).toBe("Asia/Phnom_Penh");
    });
  });
});
