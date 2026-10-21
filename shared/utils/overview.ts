import type { Currency } from "../types/money";
import { PHNOM_PENH_TZ } from "./date";
import { settle, type SettlementEntry, type SettlementMember } from "./settle";

interface OverviewEntry {
  status: "draft" | "published";
  currency: Currency;
  amountMinor: number;
}

export function summarizeOverviewEntries(entries: ReadonlyArray<OverviewEntry>) {
  const ledgers = {
    USD: { amountMinor: 0, count: 0 },
    KHR: { amountMinor: 0, count: 0 },
  };
  for (const entry of entries) {
    if (entry.status !== "published") continue;
    ledgers[entry.currency].amountMinor += entry.amountMinor;
    ledgers[entry.currency].count++;
  }
  return ledgers;
}

interface OverviewSettlementMember extends SettlementMember {
  nickname: string | null;
  userName: string;
}

export function buildOverviewSettlement(
  entries: ReadonlyArray<OverviewEntry & SettlementEntry>,
  members: ReadonlyArray<OverviewSettlementMember>,
) {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const memberName = (id: string) => {
    const member = memberById.get(id);
    return member ? (member.nickname ?? member.userName) : "Removed member";
  };
  const published = entries.filter((entry) => entry.status === "published");

  function plan(currency: Currency) {
    const result = settle(
      published.filter((entry) => entry.currency === currency),
      members,
    );
    return {
      currency,
      members: result.balances.map((balance) => ({
        membershipId: balance.membershipId,
        balance: balance.net,
      })),
      suggestTransfer: result.transfers.map((transfer) => ({
        ...transfer,
        fromName: memberName(transfer.fromMembershipId),
        toName: memberName(transfer.toMembershipId),
      })),
    };
  }

  return { usd: plan("USD"), khr: plan("KHR") };
}

interface OverviewExportEntry extends OverviewEntry {
  date: string;
  description: string;
  category: string;
  paidBy: string;
}

export function overviewCsv(entries: ReadonlyArray<OverviewExportEntry>) {
  const dateFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHNOM_PENH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const rows = [
    [
      "Date (Asia/Phnom_Penh)",
      "Description",
      "Category",
      "Paid by",
      "Currency",
      "Amount (minor units)",
      "Status",
    ],
    ...entries.map((entry) => [
      dateFormat.format(new Date(entry.date)),
      entry.description,
      entry.category,
      entry.paidBy,
      entry.currency,
      String(entry.amountMinor),
      entry.status,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string) {
  // Quoting alone does not prevent spreadsheet formula execution.
  const safe = /^\s*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
