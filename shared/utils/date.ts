import dayjs from "dayjs";

import type { Dayjs } from "dayjs";

import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const PHNOM_PENH_TZ = "Asia/Phnom_Penh";

dayjs.tz.setDefault(PHNOM_PENH_TZ);

/**
 * Whether a value is a month key in `YYYY-MM` form.
 *
 * @param value - Anything; non-strings are rejected.
 * @returns `true` when `value` parses as a valid `YYYY-MM` month.
 */
export function isValidMonthKey(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Strict parse + round-trip rejects rolled-over keys like "2026-13",
  // which dayjs would silently coerce to 2027-01.
  const d = dayjs(value, "YYYY-MM", true);
  return d.isValid() && d.format("YYYY-MM") === value;
}

/**
 * Format a date as a `YYYY-MM` month key.
 *
 * @param date - Any date; defaults to now when omitted.
 * @returns The month key, e.g. `"2026-08"`.
 */
export function monthKey(date?: Date): string {
  return dayjs(date).tz(PHNOM_PENH_TZ).format("YYYY-MM");
}

/**
 * Get the current date and time in the Phnom Penh timezone.
 *
 * @returns A Dayjs instance representing the current time in Phnom Penh.
 */
export function now(): Dayjs {
  return dayjs().tz(PHNOM_PENH_TZ);
}

/**
 * Current day-of-month (1–31) in the Phnom Penh timezone.
 *
 * @returns The ICT calendar day for "now".
 */
export function currentDayOfMonth(): number {
  return dayjs().tz(PHNOM_PENH_TZ).date();
}

/**
 * Parse a date string into a Dayjs instance.
 *
 * @param iso - Date string to parse.
 * @param format - Optional dayjs parse format; defaults to native ISO-8601.
 * @returns A valid Dayjs instance.
 */
export function toDayJS(iso: string, format?: string): Dayjs {
  const d = format ? dayjs(iso, format, true) : dayjs(iso);
  if (!d.isValid()) {
    throw new Error(`Invalid date string: ${iso}`);
  }
  return d;
}

/**
 * Half-open month bounds `[start, end)` in the Phnom Penh timezone.
 *
 * `start` is the first instant of the month and `end` is the first instant of
 * the next month, so `end` is an exclusive upper bound.
 *
 * @param value - Month key in `YYYY-MM`.
 * @returns `{ start, end }` dayjs bounds in `Asia/Phnom_Penh`.
 * @throws {Error} When `value` is not a valid `YYYY-MM` month key.
 */
export function monthRange(value: string): { start: Dayjs; end: Dayjs } {
  const date = toDayJS(value, "YYYY-MM");
  const start = dayjs.tz(date);
  const end = dayjs.tz(date).add(1, "month");

  return { start, end };
}

/**
 * Number of calendar days in a month.
 *
 * @param value - Month key in `YYYY-MM`.
 * @returns The day count (28–31).
 * @throws {Error} When `value` is not a valid `YYYY-MM` month key.
 */
export function daysInMonth(value: string): number {
  const date = toDayJS(value, "YYYY-MM");
  return date.daysInMonth();
}

/**
 * Whole calendar days a member was active within a month.
 *
 * The membership window `[joinedAt, leftAt]` is clamped to the month bounds
 * `[monthStart, monthEnd)` and counted as inclusive whole days. A `leftAt` of
 * `null` means the member is still active and is clamped to the month end.
 *
 * Example: a member who joined on the 1st and never left in a 31-day month
 * returns `31`; a member who joined on the 10th and left on the 15th returns
 * `6`.
 *
 * @param value - Month key in `YYYY-MM`.
 * @param joinedAt - When the member joined the room.
 * @param leftAt - When the member left, or `null` if still active.
 * @returns The inclusive active day count in this month (`>= 0`).
 * @throws {Error} When `value` is not a valid `YYYY-MM` month key.
 */
export function activeDaysInMonth(value: string, joinedAt: Date, leftAt: Date | null): number {
  const { start: monthStart, end: monthEnd } = monthRange(value);

  // Clamp the membership window to the month. leftAt=null means still active,
  // so the upper bound is the (exclusive) month end.
  const effectiveStart = dayjs(joinedAt).isAfter(monthStart) ? dayjs(joinedAt) : monthStart;
  const effectiveEnd = leftAt && dayjs(leftAt).isBefore(monthEnd) ? dayjs(leftAt) : monthEnd;

  if (!effectiveEnd.isAfter(effectiveStart)) return 0;

  // Normalise to whole calendar days, then clamp the end to the month's last
  // day (monthEnd is the 1st of the next month).
  const startDate = effectiveStart.format("YYYY-MM-DD");
  const lastDate = toDayJS(value, "YYYY-MM").endOf("month").format("YYYY-MM-DD");
  let endDate = effectiveEnd.format("YYYY-MM-DD");
  if (endDate > lastDate) endDate = lastDate;

  return dayjs(endDate).diff(dayjs(startDate), "day") + 1;
}

/**
 * Get the ordinal suffix for a day of the month (1–31).
 */
export function dayOrdinal(day: number) {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
