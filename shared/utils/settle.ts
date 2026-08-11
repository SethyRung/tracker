import { BPS_TOTAL } from "../types/weight";
import { proRatedWeights } from "./pro-rate";

// Settlement algorithm (Phase 10 / SPEC §10). Pure — takes pre-loaded
// entries + members, returns balances + a minimum-transfer list. The DB-
// using wrapper lives in server/utils/settle.ts.
//
// Settlement is per (room, yyyymm, currency). Each call processes ONE
// currency; the API route runs the algorithm twice (USD, KHR) for the
// side-by-side display.

export interface SettlementEntry {
  // Pre-loaded entry fields the algorithm needs.
  amountMinor: number;
  paidByMembershipId: string;
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
// `members` is the full active+inactive set so pro-rating can resolve
// joinedAt/leftAt for departed members (their effective weight may still
// be > 0 if the entry was created while they were active).
export function settle(
  entries: ReadonlyArray<SettlementEntry>,
  members: ReadonlyArray<SettlementMember>,
  yyyymm: string,
): SettlementResult {
  const paidByMember = new Map<string, number>();
  const owedByMember = new Map<string, number>();
  for (const m of members) {
    paidByMember.set(m.id, 0);
    owedByMember.set(m.id, 0);
  }

  for (const entry of entries) {
    // Defensive: an entry may reference a payer that has since been removed.
    if (!paidByMember.has(entry.paidByMembershipId)) {
      paidByMember.set(entry.paidByMembershipId, 0);
      owedByMember.set(entry.paidByMembershipId, 0);
    }

    const proRated = proRatedWeights({
      weights: entry.weights,
      yyyymm,
      members,
    });

    // Integer math with explicit remainder distribution. Pro-rated weights
    // sum to BPS_TOTAL exactly (Phase 9 invariant), so
    //   sum(floor(M * w / BPS_TOTAL)) + remainder == M
    // We add the rounding remainder to the longest-tenured attendee in the
    // entry — same convention as Phase 9's pro-rate algorithm — so totals
    // stay exact and reproducible.
    const floorOwed = new Map<string, number>();
    let sumFloor = 0;
    const orderedMids: string[] = [];
    for (const [membershipId, weightBps] of proRated) {
      const owed = Math.floor((entry.amountMinor * weightBps) / BPS_TOTAL);
      floorOwed.set(membershipId, owed);
      sumFloor += owed;
      orderedMids.push(membershipId);
    }
    const remainder = entry.amountMinor - sumFloor;

    paidByMember.set(
      entry.paidByMembershipId,
      (paidByMember.get(entry.paidByMembershipId) ?? 0) + entry.amountMinor,
    );

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
