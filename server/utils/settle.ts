import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

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

export async function settleRoom(
  options: SettleOptions,
): Promise<{ USD: CurrencyPlan; KHR: CurrencyPlan }> {
  const { start, end } = monthRange(options.yyyymm);

  const memberRows = await db
    .select({
      id: schema.roomMemberships.id,
      joinedAt: schema.roomMemberships.joinedAt,
      leftAt: schema.roomMemberships.leftAt,
    })
    .from(schema.roomMemberships)
    .where(eq(schema.roomMemberships.roomId, options.roomId))
    .orderBy(asc(schema.roomMemberships.joinedAt));

  const members: SettlementMember[] = memberRows.map((m) => ({
    id: m.id,
    joinedAt: m.joinedAt,
    leftAt: m.leftAt,
  }));

  const entryRows = await db
    .select({
      id: schema.entries.id,
      currency: schema.entries.currency,
      amountMinor: schema.entries.amountMinor,
      paidByMembershipId: schema.entries.paidByMembershipId,
    })
    .from(schema.entries)
    .where(
      and(
        eq(schema.entries.roomId, options.roomId),
        eq(schema.entries.status, "published"),
        gte(schema.entries.date, start.toDate()),
        lt(schema.entries.date, end.toDate()),
      ),
    );

  const finalWeightRows = entryRows.length
    ? await db
        .select({
          entryId: schema.entryWeights.entryId,
          membershipId: schema.entryWeights.membershipId,
          weightBps: schema.entryWeights.weightBps,
        })
        .from(schema.entryWeights)
        .where(
          inArray(
            schema.entryWeights.entryId,
            entryRows.map((e) => e.id),
          ),
        )
    : [];

  const weightsByEntry = new Map<string, Array<{ membershipId: string; weightBps: number }>>();
  for (const w of finalWeightRows) {
    const list = weightsByEntry.get(w.entryId) ?? [];
    list.push({ membershipId: w.membershipId, weightBps: w.weightBps });
    weightsByEntry.set(w.entryId, list);
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
