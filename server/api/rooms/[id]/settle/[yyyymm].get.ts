import { asc, eq } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";
import { isValidMonthKey } from "~~/shared/types/date";
import { formatMoney, type Currency } from "~~/shared/types/money";
import { settleRoom } from "~~/server/utils/settle";
import type { SettlementResult } from "~~/shared/utils/settle";

// Settlement view (SPEC §10): balances + minimum-transfer plan per currency.
//
// The response is fully resolved server-side — display names, colors and
// formatted money strings are all included so the client renders it as-is
// without joining against /members or doing any money math of its own.

export interface SettleMemberView {
  membershipId: string;
  name: string;
  color: string | null;
  paid: number;
  paidFormatted: string;
  owed: number;
  owedFormatted: string;
  // Net position for the month: paid - owed. > 0 = is owed money,
  // < 0 = owes money, 0 = square.
  balance: number;
  balanceFormatted: string;
  // Position after applying every suggested transfer below. The greedy plan
  // settles all balances in full, so this is 0 for everyone — it is here as
  // a client-visible proof that the plan actually clears the month.
  newBalance: number;
  newBalanceFormatted: string;
}

export interface SettleTransferView {
  fromMembershipId: string;
  fromName: string;
  toMembershipId: string;
  toName: string;
  amountMinor: number;
  amountFormatted: string;
}

export interface SettleCurrencyView {
  currency: Currency;
  members: SettleMemberView[];
  suggestTransfer: SettleTransferView[];
  totalImbalance: number;
  totalImbalanceFormatted: string;
  // True when nobody has a non-zero balance for this currency.
  isSettled: boolean;
  // True when the month has no entries at all in this currency.
  hasActivity: boolean;
}

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const yyyymm = getRouterParam(event, "yyyymm");
  if (!roomId || !yyyymm) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }
  if (!isValidMonthKey(yyyymm)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: `Invalid month key: ${yyyymm}`,
    });
  }

  await requireRoomContext(event, roomId);

  const [plans, memberRows] = await Promise.all([
    settleRoom({ roomId, yyyymm }),
    db
      .select({
        id: roomMemberships.id,
        displayName: roomMemberships.displayName,
        nickname: roomMemberships.nickname,
        color: roomMemberships.color,
      })
      .from(roomMemberships)
      .where(eq(roomMemberships.roomId, roomId))
      .orderBy(asc(roomMemberships.joinedAt)),
  ]);

  const memberById = new Map(memberRows.map((m) => [m.id, m]));
  const nameOf = (membershipId: string) =>
    memberById.get(membershipId)?.displayName ?? "Removed member";
  const colorOf = (membershipId: string) => memberById.get(membershipId)?.color ?? null;

  const toView = (currency: Currency, result: SettlementResult): SettleCurrencyView => {
    const fmt = (amountMinor: number) => formatMoney({ amount_minor: amountMinor, currency });

    // Apply the plan to each balance so `newBalance` reflects the member's
    // position once every suggested transfer has been made. A debtor's
    // negative balance moves up as they pay out; a creditor's positive
    // balance moves down as they are paid.
    const settledDelta = new Map<string, number>();
    for (const t of result.transfers) {
      settledDelta.set(
        t.fromMembershipId,
        (settledDelta.get(t.fromMembershipId) ?? 0) + t.amountMinor,
      );
      settledDelta.set(t.toMembershipId, (settledDelta.get(t.toMembershipId) ?? 0) - t.amountMinor);
    }

    const members = result.balances
      .map((b): SettleMemberView => {
        const newBalance = b.net + (settledDelta.get(b.membershipId) ?? 0);
        return {
          membershipId: b.membershipId,
          name: nameOf(b.membershipId),
          color: colorOf(b.membershipId),
          paid: b.paid,
          paidFormatted: fmt(b.paid),
          owed: b.owed,
          owedFormatted: fmt(b.owed),
          balance: b.net,
          balanceFormatted: fmt(b.net),
          newBalance,
          newBalanceFormatted: fmt(newBalance),
        };
      })
      // Creditors first, then debtors — the order the UI renders.
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));

    const suggestTransfer = result.transfers.map(
      (t): SettleTransferView => ({
        fromMembershipId: t.fromMembershipId,
        fromName: nameOf(t.fromMembershipId),
        toMembershipId: t.toMembershipId,
        toName: nameOf(t.toMembershipId),
        amountMinor: t.amountMinor,
        amountFormatted: fmt(t.amountMinor),
      }),
    );

    return {
      currency,
      members,
      suggestTransfer,
      totalImbalance: result.totalImbalance,
      totalImbalanceFormatted: fmt(result.totalImbalance),
      isSettled: members.every((m) => m.balance === 0),
      hasActivity: members.some((m) => m.paid !== 0 || m.owed !== 0),
    };
  };

  return createResponse(
    { code: ApiResponseCode.Success },
    {
      yyyymm,
      usd: toView("USD", plans.USD.result),
      khr: toView("KHR", plans.KHR.result),
    },
  );
});
