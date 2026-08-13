import { BPS_TOTAL } from "../types/weight";

export interface SnapshotEntry {
  membershipId: string;
  weightBps: number;
}

export interface TemplateSnapshotInput {
  id: string;
  categoryId: string;
  currency: "USD" | "KHR";
  amountMinor: number;
  memberSnapshot: SnapshotEntry[];
}

export interface DraftRow {
  id: string;
  roomId: string;
  categoryId: string;
  currency: "USD" | "KHR";
  amountMinor: number;
  date: Date;
  paidByMembershipId: string;
  status: "published";
  templateId: string;
  createdByUserId: string;
}

export interface PlannedDraft {
  draft: DraftRow;
  weights: Array<{ membershipId: string; weightBps: number }>;
}

export interface PlanDraftOptions {
  newEntryId: string;
  roomId: string;
  createdByUserId: string;
  monthStart: Date;
  paidByMembershipId: string;
}

export function pruneSnapshot(
  snapshot: SnapshotEntry[],
  activeMemberIds: ReadonlySet<string>,
): SnapshotEntry[] | null {
  const kept = snapshot.filter((s) => activeMemberIds.has(s.membershipId));
  if (kept.length === 0) return null;
  if (kept.length === snapshot.length) return kept;

  const rawTotal = kept.reduce((s, e) => s + e.weightBps, 0);
  if (rawTotal === 0) return null;
  if (rawTotal === BPS_TOTAL) return kept;

  const rescaled = kept.map((e) => ({
    membershipId: e.membershipId,
    weightBps: Math.floor((e.weightBps * BPS_TOTAL) / rawTotal),
  }));
  const allocated = rescaled.reduce((s, e) => s + e.weightBps, 0);
  const remainder = BPS_TOTAL - allocated;
  if (remainder > 0 && rescaled[0]) {
    rescaled[0] = { ...rescaled[0], weightBps: rescaled[0].weightBps + remainder };
  }
  return rescaled;
}

export function planDraftForTemplate(
  template: TemplateSnapshotInput,
  activeMemberIds: ReadonlySet<string>,
  options: PlanDraftOptions,
): PlannedDraft | null {
  const weights = pruneSnapshot(template.memberSnapshot, activeMemberIds);
  if (!weights) return null;

  return {
    draft: {
      id: options.newEntryId,
      roomId: options.roomId,
      categoryId: template.categoryId,
      currency: template.currency,
      amountMinor: template.amountMinor,
      date: options.monthStart,
      paidByMembershipId: options.paidByMembershipId,
      status: "published",
      templateId: template.id,
      createdByUserId: options.createdByUserId,
    },
    weights,
  };
}

export function alreadyMaterialized(
  existingDraftRows: ReadonlyArray<{ templateId: string | null; date: Date | string }>,
  templateId: string,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  const startMs = monthStart.getTime();
  const endMs = monthEnd.getTime();
  for (const row of existingDraftRows) {
    if (row.templateId !== templateId) continue;
    const t = new Date(row.date).getTime();
    if (t >= startMs && t < endMs) return true;
  }
  return false;
}

export function equalSplitSnapshot(memberIds: string[]): SnapshotEntry[] {
  const n = memberIds.length;
  if (n === 0) return [];
  const base = Math.floor(BPS_TOTAL / n);
  const out = memberIds.map((membershipId) => ({ membershipId, weightBps: base }));
  const remainder = BPS_TOTAL - base * n;
  if (remainder > 0 && out[0]) {
    out[0] = { ...out[0], weightBps: out[0].weightBps + remainder };
  }
  return out;
}
