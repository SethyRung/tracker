import { BPS_TOTAL } from "../types/weight";

export interface SettlementEntry {
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
  net: number;
}

export interface SettlementTransfer {
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
}

export interface SettlementResult {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];

  totalImbalance: number;
}

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
    if (!paidByMember.has(entry.paidByMembershipId)) {
      paidByMember.set(entry.paidByMembershipId, 0);
      owedByMember.set(entry.paidByMembershipId, 0);
    }

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

    paidByMember.set(
      entry.paidByMembershipId,
      (paidByMember.get(entry.paidByMembershipId) ?? 0) + entry.amountMinor,
    );

    if (remainder > 0 && orderedMids.length > 0) {
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

  const transfers = greedyMinTransfers(balances);

  const totalImbalance = balances.reduce((s, b) => s + Math.abs(b.net), 0);

  return { balances, transfers, totalImbalance };
}

export function greedyMinTransfers(
  balances: ReadonlyArray<SettlementBalance>,
): SettlementTransfer[] {
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
