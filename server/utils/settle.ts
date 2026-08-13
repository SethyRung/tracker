import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "hub:db";
import { entries, entryWeights, roomMemberships } from "hub:db:schema";

import {
  settle,
  type SettlementEntry,
  type SettlementMember,
  type SettlementResult,
} from "~~/shared/utils/settle";

export interface CurrencyPlan {
  currency: "USD" | "KHR";
  result: SettlementResult;
}

export interface SettleOptions {
  roomId: string;
  yyyymm: string;
}

// Loads the month's published entries (with weights) and members, then runs
// the settlement algorithm per currency. The full members set (active +
// inactive) is passed so departed members referenced by historical entry
// weights still resolve by id.
export async function settleRoom(
  options: SettleOptions,
): Promise<{ USD: CurrencyPlan; KHR: CurrencyPlan }> {
  const { start, end } = monthRange(options.yyyymm);

  // All room members (active + inactive) — departed members are still
  // referenced by the weights on old entries and must resolve by id.
  const memberRows = await db
    .select({
      id: roomMemberships.id,
      joinedAt: roomMemberships.joinedAt,
      leftAt: roomMemberships.leftAt,
    })
    .from(roomMemberships)
    .where(eq(roomMemberships.roomId, options.roomId))
    .orderBy(asc(roomMemberships.joinedAt));

  const members: SettlementMember[] = memberRows.map((m) => ({
    id: m.id,
    joinedAt: m.joinedAt,
    leftAt: m.leftAt,
  }));

  // Published entries in the target month for this room. Drafts are ignored
  // (SPEC §8: drafts don't count in settlement).
  const entryRows = await db
    .select({
      id: entries.id,
      currency: entries.currency,
      amountMinor: entries.amountMinor,
      paidByMembershipId: entries.paidByMembershipId,
    })
    .from(entries)
    .where(
      and(
        eq(entries.roomId, options.roomId),
        eq(entries.status, "published"),
        gte(entries.date, start.toDate()),
        lt(entries.date, end.toDate()),
      ),
    );

  // Weights for those entries in a single query.
  const finalWeightRows = entryRows.length
    ? await db
        .select({
          entryId: entryWeights.entryId,
          membershipId: entryWeights.membershipId,
          weightBps: entryWeights.weightBps,
        })
        .from(entryWeights)
        .where(
          inArray(
            entryWeights.entryId,
            entryRows.map((e) => e.id),
          ),
        )
    : [];

  const weightsByEntry = new Map<string, Array<{ membershipId: string; weightBps: number }>>();
  for (const w of finalWeightRows) {
    if (!weightsByEntry.has(w.entryId)) weightsByEntry.set(w.entryId, []);
    weightsByEntry.get(w.entryId)!.push({ membershipId: w.membershipId, weightBps: w.weightBps });
  }

  const toSettlementEntries = (currency: "USD" | "KHR"): SettlementEntry[] =>
    entryRows
      .filter((e) => e.currency === currency)
      .map((e) => ({
        amountMinor: Number(e.amountMinor),
        paidByMembershipId: e.paidByMembershipId,
        weights: weightsByEntry.get(e.id) ?? [],
      }));

  return {
    USD: { currency: "USD", result: settle(toSettlementEntries("USD"), members) },
    KHR: { currency: "KHR", result: settle(toSettlementEntries("KHR"), members) },
  };
}
