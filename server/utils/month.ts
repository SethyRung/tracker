import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { monthSnapshots } from "hub:db:schema";

// Derive a "YYYY-MM" month key from a Date in Asia/Phnom_Penh time. Pure
// helper (no DB) — shared with the test suite.
export function monthKeyFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHNOM_PENH_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  if (!y || !m) throw new Error("Failed to derive ICT month key");
  return `${y}-${m}`;
}

// Read a snapshot for a (room, yyyymm) pair. Returns null when no snapshot
// exists yet — a month is implicitly OPEN until someone closes it. This is
// lazy so we don't write a row per (room, month) at signup.
export async function getMonthSnapshot(roomId: string, yyyymm: string) {
  if (!isValidMonthKey(yyyymm)) {
    throw new Error(`Invalid month key: ${yyyymm}`);
  }
  const rows = await db
    .select()
    .from(monthSnapshots)
    .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)))
    .limit(1);
  return rows[0] ?? null;
}

export async function isMonthClosed(roomId: string, yyyymm: string): Promise<boolean> {
  const snapshot = await getMonthSnapshot(roomId, yyyymm);
  return snapshot?.status === "closed";
}

// Throws if the month is closed. Call from every mutation route (entries
// POST/PATCH/DELETE/publish). SPEC §9: closed months block ALL edits — admin
// must reopen first. (PLAN §8 said "admin edits allowed with a banner"; SPEC
// wins per AGENTS.md.)
export async function assertMonthOpen(roomId: string, yyyymm: string): Promise<void> {
  if (await isMonthClosed(roomId, yyyymm)) {
    throw new Error(`Month ${yyyymm} is closed — reopen it before making changes.`);
  }
}

// Convenience wrapper that resolves the yyyymm from a Date for the caller.
export async function assertMonthOpenForDate(roomId: string, date: Date): Promise<void> {
  await assertMonthOpen(roomId, monthKeyFromDate(date));
}
