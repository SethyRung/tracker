import { BPS_TOTAL } from "../types/weight";

// Settlement algorithm (SPEC §10). Pure — takes pre-loaded entries + members,
// returns balances + a minimum-transfer list. The DB-using wrapper lives in
// server/utils/settle.ts.
//
// Settlement is per (room, yyyymm, currency). Each call processes ONE
// currency; the API route runs the algorithm twice (USD, KHR) for the
// side-by-side display.
//
// Entry weights are used exactly as stored. There is no tenure pro-rating:
// an attendee's share of an entry is the weight set on that entry, whether
// they joined the room last year or last week.

export interface SettlementEntry {
  // Pre-loaded entry fields the algorithm needs.
  amountMinor: number;
  // Who put money down, and how much. Sums to amountMinor.
  payers: ReadonlyArray<{ membershipId: string; amountMinor: number }>;
  weights: ReadonlyArray<{ membershipId: string; weightBps: number }>;
}

export interface SettlementMember {
  id: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface SettlementBalance {
  membershipId: string;
  paid: number;
  owed: number;
  net: number; // paid - owed. > 0 = creditor, < 0 = debtor, == 0 = settled.
}

export interface SettlementTransfer {
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
}

export interface SettlementResult {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
  // Sum of |net| across members — sanity-check value (must match total
  // transfers sum / 2 since each cent of imbalance is paid once).
  totalImbalance: number;
}

// Compute per-member net positions, then the minimum-transfer list.
// `members` is the full active+inactive set so departed members referenced by
// an entry's weights still resolve (and so rounding remainders can be
// assigned deterministically to the longest-tenured attendee).
export function settle(
  entries: ReadonlyArray<SettlementEntry>,
  members: ReadonlyArray<SettlementMember>,
): SettlementResult {
  const paidByMember = new Map<string, number>();
  const owedByMember = new Map<string, number>();
  for (const m of members) {
    paidByMember.set(m.id, 0);
    owedByMember.set(m.id, 0);
  }

  for (const entry of entries) {
    // Defensive: an entry may reference a payer that has since been removed.
    for (const p of entry.payers) {
      if (!paidByMember.has(p.membershipId)) {
        paidByMember.set(p.membershipId, 0);
        owedByMember.set(p.membershipId, 0);
      }
    }

    // Integer math with explicit remainder distribution. Entry weights sum
    // to BPS_TOTAL (validated on write), so
    //   sum(floor(M * w / BPS_TOTAL)) + remainder == M
    // We add the rounding remainder to the longest-tenured attendee so
    // totals stay exact and reproducible.
    const floorOwed = new Map<string, number>();
    let sumFloor = 0;
    const orderedMids: string[] = [];
    for (const { membershipId, weightBps } of entry.weights) {
      const owed = Math.floor((entry.amountMinor * weightBps) / BPS_TOTAL);
      floorOwed.set(membershipId, owed);
      sumFloor += owed;
      orderedMids.push(membershipId);
    }
    const remainder = entry.amountMinor - sumFloor;

    for (const p of entry.payers) {
      paidByMember.set(p.membershipId, (paidByMember.get(p.membershipId) ?? 0) + p.amountMinor);
    }

    if (remainder > 0 && orderedMids.length > 0) {
      // Longest-tenured among attendees that owed something. Falls back to
      // the first attendee if no member lookup works.
      const memberById = new Map(members.map((m) => [m.id, m]));
      let target = orderedMids[0]!;
      for (const mid of orderedMids) {
        const cur = memberById.get(target);
        const next = memberById.get(mid);
        if (!cur || !next) continue;
        if (next.joinedAt.getTime() < cur.joinedAt.getTime()) target = mid;
      }
      floorOwed.set(target, (floorOwed.get(target) ?? 0) + remainder);
    }

    for (const [membershipId, owed] of floorOwed) {
      owedByMember.set(membershipId, (owedByMember.get(membershipId) ?? 0) + owed);
    }
  }

  const balances: SettlementBalance[] = members.map((m) => {
    const paid = paidByMember.get(m.id) ?? 0;
    const owed = owedByMember.get(m.id) ?? 0;
    return {
      membershipId: m.id,
      paid,
      owed,
      net: paid - owed,
    };
  });

  // Greedy minimum-transfer: largest creditor vs largest debtor, transfer
  // min(|creditor|, |debtor|), repeat. Produces <= N-1 transfers for N
  // participants with non-zero net.
  const transfers = greedyMinTransfers(balances);

  const totalImbalance = balances.reduce((s, b) => s + Math.abs(b.net), 0);

  return { balances, transfers, totalImbalance };
}

// Pure greedy minimum-transfer (also exported for the test suite).
// Operates on a copy of balances so the input is not mutated.
export function greedyMinTransfers(
  balances: ReadonlyArray<SettlementBalance>,
): SettlementTransfer[] {
  // Mutable working copies with non-zero net only.
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);

  const out: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const c = creditors[i]!;
    const d = debtors[j]!;
    const amount = Math.min(c.net, -d.net);
    if (amount > 0) {
      out.push({
        fromMembershipId: d.membershipId,
        toMembershipId: c.membershipId,
        amountMinor: amount,
      });
      c.net -= amount;
      d.net += amount;
    }
    if (c.net === 0) i++;
    if (d.net === 0) j++;
  }
  return out;
}
