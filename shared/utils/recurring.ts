import { BPS_TOTAL } from "../types/weight";
import { splitByWeights } from "./payers";

// Pure helpers for recurring-template materialization (Phase 7). The DB-using
// wrapper lives in `server/utils/recurring.ts`; this file has zero side effects
// and is exercised by `test/unit/recurring.test.ts`.

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
  // Payer proportions in bps. Null/empty => single fallback payer.
  payerSnapshot?: SnapshotEntry[] | null;
}

export interface DraftRow {
  id: string;
  roomId: string;
  categoryId: string;
  currency: "USD" | "KHR";
  amountMinor: number;
  date: Date;
  // Materialized recurring entries are created `published` so they count
  // toward settlement immediately. An admin can still edit the amount or
  // weights during the open month; there is no review-before-publish gate.
  status: "published";
  templateId: string;
  createdByUserId: string;
}

export interface PlannedDraft {
  draft: DraftRow;
  weights: Array<{ membershipId: string; weightBps: number }>;
  payers: Array<{ membershipId: string; amountMinor: number }>;
}

export interface PlanDraftOptions {
  newEntryId: string;
  roomId: string;
  createdByUserId: string;
  monthStart: Date;
  // Payer used when the template has no usable payer snapshot.
  fallbackPayerMembershipId: string;
}

// Split `amountMinor` across payers by their bps shares. Delegates to the
// shared splitter so template materialization and the UI's "each pays own
// share" detection use identical arithmetic.
export function payerAmounts(
  amountMinor: number,
  payers: ReadonlyArray<SnapshotEntry>,
): Array<{ membershipId: string; amountMinor: number }> {
  return splitByWeights(amountMinor, payers);
}

// Prune the template's member_snapshot to members still active in the room,
// then renormalize weights so they still sum to BPS_TOTAL. Members not in the
// snapshot are NOT added — the snapshot is the canonical attendee list (admin
// must edit the template to add new members). Returns null if every snapshot
// member has departed (we don't materialize empty drafts).
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

  // Rescale to BPS_TOTAL preserving each remaining member's relative share.
  // Use floor so we never overshoot, then add the leftover to the longest-
  // tenured kept member (the first one — preserves admin ordering).
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

  // Payers are pruned to active members the same way. If nothing usable
  // survives, fall back to a single payer covering the whole amount.
  const prunedPayers = template.payerSnapshot?.length
    ? pruneSnapshot(template.payerSnapshot, activeMemberIds)
    : null;
  const payers = prunedPayers
    ? payerAmounts(template.amountMinor, prunedPayers)
    : [{ membershipId: options.fallbackPayerMembershipId, amountMinor: template.amountMinor }];

  return {
    draft: {
      id: options.newEntryId,
      roomId: options.roomId,
      categoryId: template.categoryId,
      currency: template.currency,
      amountMinor: template.amountMinor,
      date: options.monthStart,
      status: "published",
      templateId: template.id,
      createdByUserId: options.createdByUserId,
    },
    weights,
    payers,
  };
}

// Idempotency check: skip if any draft for this template exists in the target
// month. `existingDraftRows` is whatever the caller has already loaded — they
// decide whether to scan published/draft, the entire month, etc.
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

// Default snapshot for a brand-new template — equal split across the given
// active members (used by the POST route when the admin doesn't supply one).
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
