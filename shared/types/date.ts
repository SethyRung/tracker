import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const PHNOM_PENH_TZ = "Asia/Phnom_Penh";

const YYYYMM = /^\d{4}-(0[1-9]|1[0-2])$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isValidMonthKey(value: unknown): value is `${number}-${number}` {
  return typeof value === "string" && YYYYMM.test(value);
}

export function monthKey(date: Date): string {
  return dayjs(date).format("YYYY-MM");
}

export function toUtc(date: Date): Date {
  return date;
}

export function fromUtc(date: Date): Date {
  return date;
}

export function monthRange(yyyymm: string): { start: Date; end: Date } {
  if (!isValidMonthKey(yyyymm)) {
    throw new Error(`Invalid month key: ${yyyymm}`);
  }
  const start = dayjs.tz(`${yyyymm}-01T00:00:00`, PHNOM_PENH_TZ).utc().toDate();
  const end = dayjs.tz(`${yyyymm}-01T00:00:00`, PHNOM_PENH_TZ).add(1, "month").utc().toDate();
  return { start, end };
}

export function daysInMonth(yyyymm: string): number {
  return dayjs(`${yyyymm}-01`).daysInMonth();
}

export function activeDaysInMonth(yyyymm: string, joinedAt: Date, leftAt: Date | null): number {
  if (!isValidMonthKey(yyyymm)) {
    throw new Error(`Invalid month key: ${yyyymm}`);
  }
  const monthStart = dayjs.tz(`${yyyymm}-01T00:00:00`, PHNOM_PENH_TZ);
  const monthEnd = monthStart.add(1, "month");
  const effectiveStart = dayjs(joinedAt).isAfter(monthStart) ? dayjs(joinedAt) : monthStart;
  const effectiveEnd = leftAt && dayjs(leftAt).isBefore(monthEnd) ? dayjs(leftAt) : monthEnd;

  if (!effectiveEnd.isAfter(effectiveStart)) return 0;

  const startCal = effectiveStart.format("YYYY-MM-DD").split("-").map(Number);
  let endCal = effectiveEnd.format("YYYY-MM-DD").split("-").map(Number);

  const [yearStr, monthStr] = yyyymm.split("-");
  const yearNum = Number(yearStr);
  const monthNum = Number(monthStr);
  const lastDay = daysInMonth(yyyymm);
  const startYear = startCal[0] ?? yearNum;
  const startMonth = startCal[1] ?? monthNum;
  const startDay = startCal[2] ?? 1;
  let endYear = endCal[0] ?? yearNum;
  let endMonth = endCal[1] ?? monthNum;
  let endDay = endCal[2] ?? lastDay;
  if (endYear > yearNum || (endYear === yearNum && endMonth > monthNum)) {
    endYear = yearNum;
    endMonth = monthNum;
    endDay = lastDay;
  }

  const startUTC = Date.UTC(startYear, startMonth - 1, startDay);
  const endUTC = Date.UTC(endYear, endMonth - 1, endDay);
  const diff = Math.round((endUTC - startUTC) / MS_PER_DAY);
  return diff + 1;
}

export function currentMonthKey(): string {
  return dayjs().format("YYYY-MM");
}
