import { activeDaysInMonth, daysInMonth, isValidMonthKey } from "../types/date";
import { BPS_TOTAL } from "../types/weight";

export interface ProRateMember {
  id: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface ProRateWeight {
  membershipId: string;
  weightBps: number;
}

export interface ProRateInput {
  weights: ReadonlyArray<ProRateWeight>;
  yyyymm: string;
  members: ReadonlyArray<ProRateMember>;
}

export function proRatedWeights(input: ProRateInput): Map<string, number> {
  if (!isValidMonthKey(input.yyyymm)) {
    throw new Error(`Invalid month key: ${input.yyyymm}`);
  }
  const monthDays = daysInMonth(input.yyyymm);
  if (monthDays <= 0) {
    throw new Error(`Month ${input.yyyymm} has ${monthDays} days`);
  }

  const memberById = new Map<string, ProRateMember>();
  for (const m of input.members) {
    memberById.set(m.id, m);
  }

  type Intermediate = {
    membershipId: string;
    raw: number;
    floored: number;
    activeDays: number;
    joinedAt: Date;
  };

  const rows: Intermediate[] = [];
  for (const w of input.weights) {
    const member = memberById.get(w.membershipId);
    if (!member) {
      rows.push({
        membershipId: w.membershipId,
        raw: 0,
        floored: 0,
        activeDays: 0,
        joinedAt: new Date(0),
      });
      continue;
    }
    const activeDays = activeDaysInMonth(input.yyyymm, member.joinedAt, member.leftAt);
    const raw = (w.weightBps * activeDays) / monthDays;
    rows.push({
      membershipId: w.membershipId,
      raw,
      floored: Math.floor(raw),
      activeDays,
      joinedAt: member.joinedAt,
    });
  }

  const totalFloored = rows.reduce((s, r) => s + r.floored, 0);
  const remainder = BPS_TOTAL - totalFloored;

  const out = new Map<string, number>();
  for (const r of rows) {
    out.set(r.membershipId, r.floored);
  }

  if (remainder > 0) {
    // Longest-tenured contributor: earliest joinedAt among rows with at
    // least one active day. If no contributor, the entry is degenerate and
    // we leave weights at 0 (settlement just zeros out — see Phase 10).
    const contributors = rows.filter((r) => r.activeDays > 0);
    if (contributors.length > 0) {
      let target = contributors[0]!;
      for (const c of contributors) {
        if (c.joinedAt.getTime() < target.joinedAt.getTime()) target = c;
      }
      out.set(target.membershipId, (out.get(target.membershipId) ?? 0) + remainder);
    }
  }

  return out;
}
