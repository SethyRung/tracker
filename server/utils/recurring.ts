import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "hub:db";
import {
  categories,
  entries,
  entryPayers,
  entryWeights,
  recurringTemplates,
  roomMemberships,
} from "hub:db:schema";
import { monthRange, PHNOM_PENH_TZ } from "~~/shared/types/date";
import {
  alreadyMaterialized,
  planDraftForTemplate,
  type TemplateSnapshotInput,
} from "~~/shared/utils/recurring";

export interface MaterializeOptions {
  roomId?: string;
  monthKey?: string;
}

export interface MaterializeResult {
  monthKey: string;
  roomId: string | null;
  draftsCreated: number;
  templatesProcessed: number;
  templatesSkipped: number;
}

// One month materialization pass. Iterates every active template in scope
// (filtered by roomId if given) and inserts a draft entry + entry_weights row.
// Idempotent: skips templates that already have a draft this month.
export async function materializeRecurringDrafts(
  options: MaterializeOptions = {},
): Promise<MaterializeResult> {
  const monthKey = options.monthKey ?? currentMonthKeyPhnomPenh();
  const { start, end } = monthRange(monthKey);

  // Fetch templates: must be is_active AND the linked category must still be
  // recurring_type='recurring' (admin may have flipped it to unlimited, in
  // which case we don't want stray drafts).
  const templateRows = await db
    .select({
      id: recurringTemplates.id,
      roomId: recurringTemplates.roomId,
      categoryId: recurringTemplates.categoryId,
      currency: recurringTemplates.currency,
      amountMinor: recurringTemplates.amountMinor,
      payerSnapshot: recurringTemplates.payerSnapshot,
      memberSnapshot: recurringTemplates.memberSnapshot,
    })
    .from(recurringTemplates)
    .innerJoin(categories, eq(categories.id, recurringTemplates.categoryId))
    .where(
      options.roomId
        ? and(
            eq(recurringTemplates.isActive, true),
            eq(recurringTemplates.roomId, options.roomId),
            eq(categories.recurringType, "recurring"),
          )
        : and(eq(recurringTemplates.isActive, true), eq(categories.recurringType, "recurring")),
    );

  const templatesProcessed = templateRows.length;
  if (templatesProcessed === 0) {
    return {
      monthKey,
      roomId: options.roomId ?? null,
      draftsCreated: 0,
      templatesProcessed: 0,
      templatesSkipped: 0,
    };
  }

  const roomIds = Array.from(new Set(templateRows.map((t) => t.roomId)));
  const membersByRoom = new Map<string, Array<{ id: string; displayName: string }>>();
  for (const rid of roomIds) {
    const rows = await db
      .select({ id: roomMemberships.id, displayName: roomMemberships.displayName })
      .from(roomMemberships)
      .where(and(eq(roomMemberships.roomId, rid), eq(roomMemberships.isActive, true)))
      .orderBy(roomMemberships.joinedAt);
    membersByRoom.set(rid, rows);
  }

  const activeIdsByRoom = new Map<string, Set<string>>();
  for (const [rid, ms] of membersByRoom) {
    activeIdsByRoom.set(rid, new Set(ms.map((m) => m.id)));
  }

  const existingDraftRows = await db
    .select({ templateId: entries.templateId, date: entries.date })
    .from(entries)
    .where(
      options.roomId
        ? and(
            gte(entries.date, start) as never,
            lt(entries.date, end) as never,
            eq(entries.roomId, options.roomId),
          )
        : and(gte(entries.date, start) as never, lt(entries.date, end) as never),
    );

  let draftsCreated = 0;
  let templatesSkipped = 0;

  for (const t of templateRows) {
    const activeIds = activeIdsByRoom.get(t.roomId);
    if (!activeIds) continue;

    if (
      alreadyMaterialized(
        existingDraftRows as Array<{ templateId: string | null; date: Date | string }>,
        t.id,
        start,
        end,
      )
    ) {
      templatesSkipped++;
      continue;
    }

    const roomMembers = membersByRoom.get(t.roomId) ?? [];
    const oldestMember = roomMembers[0];
    if (!oldestMember) {
      templatesSkipped++;
      continue;
    }

    const templateInput: TemplateSnapshotInput = {
      id: t.id,
      categoryId: t.categoryId,
      currency: t.currency as "USD" | "KHR",
      amountMinor: Number(t.amountMinor),
      memberSnapshot: (t.memberSnapshot ?? []) as TemplateSnapshotInput["memberSnapshot"],
      payerSnapshot: (t.payerSnapshot ?? null) as TemplateSnapshotInput["payerSnapshot"],
    };

    const planned = planDraftForTemplate(templateInput, activeIds, {
      newEntryId: crypto.randomUUID(),
      roomId: t.roomId,
      createdByUserId: "_recurring_materialize",
      monthStart: start,
      fallbackPayerMembershipId: oldestMember.id,
    });
    if (!planned) {
      templatesSkipped++;
      continue;
    }

    // `createdByUserId` must reference `user.id` (FK). Templates materialize
    // outside any user's session; attribute it to the first payer's account.
    const attributedMembershipId = planned.payers[0]?.membershipId ?? oldestMember.id;
    const payerUser = await db
      .select({ userId: roomMemberships.userId })
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, t.roomId),
          eq(roomMemberships.isActive, true),
          eq(roomMemberships.id, attributedMembershipId),
        ),
      )
      .limit(1);
    const createdByUserId = payerUser[0]?.userId;
    if (!createdByUserId) {
      templatesSkipped++;
      continue;
    }

    await db.transaction(async (tx) => {
      await tx.insert(entries).values({
        ...planned.draft,
        createdByUserId,
      });
      await tx.insert(entryWeights).values(
        planned.weights.map((w) => ({
          entryId: planned.draft.id,
          membershipId: w.membershipId,
          weightBps: w.weightBps,
        })),
      );
      await tx.insert(entryPayers).values(
        planned.payers.map((p) => ({
          entryId: planned.draft.id,
          membershipId: p.membershipId,
          amountMinor: p.amountMinor,
        })),
      );
    });
    draftsCreated++;
  }

  return {
    monthKey,
    roomId: options.roomId ?? null,
    draftsCreated,
    templatesProcessed,
    templatesSkipped,
  };
}

// Same as currentMonthKey() in shared/types/date but exported via this util
// for callers that don't want to import the dayjs module.
export function currentMonthKeyPhnomPenh(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHNOM_PENH_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  if (!y || !m) throw new Error("Failed to derive ICT month key");
  return `${y}-${m}`;
}

export function currentDayOfMonthPhnomPenh(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHNOM_PENH_TZ,
    day: "2-digit",
  }).formatToParts(new Date());
  const d = parts.find((p) => p.type === "day")?.value;
  if (!d) throw new Error("Failed to derive ICT day of month");
  return Number(d);
}
