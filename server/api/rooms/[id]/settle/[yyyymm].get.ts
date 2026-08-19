import { db } from "@nuxthub/db";

export interface SettleMemberView {
  membershipId: string;
  name: string;
  color: string | null;
  paid: number;
  paidFormatted: string;
  owed: number;
  owedFormatted: string;
  balance: number;
  balanceFormatted: string;
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
  isSettled: boolean;
  hasActivity: boolean;
}

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const yyyymm = getRouterParam(event, "yyyymm");
  if (!yyyymm) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
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
    db.query.roomMemberships.findMany({
      columns: { id: true, displayName: true, nickname: true, color: true },
      where: (m, { eq }) => eq(m.roomId, roomId),
      orderBy: (m) => m.joinedAt,
    }),
  ]);

  const memberById = new Map(memberRows.map((m) => [m.id, m]));
  const nameOf = (membershipId: string) =>
    memberById.get(membershipId)?.displayName ?? "Removed member";
  const colorOf = (membershipId: string) => memberById.get(membershipId)?.color ?? null;

  const toView = (currency: Currency, result: SettlementResult): SettleCurrencyView => {
    const fmt = (amountMinor: number) => formatMoney({ amount_minor: amountMinor, currency });

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
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));

    const suggestTransfer = result.transfers.map((t): SettleTransferView => ({
      fromMembershipId: t.fromMembershipId,
      fromName: nameOf(t.fromMembershipId),
      toMembershipId: t.toMembershipId,
      toName: nameOf(t.toMembershipId),
      amountMinor: t.amountMinor,
      amountFormatted: fmt(t.amountMinor),
    }));

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
