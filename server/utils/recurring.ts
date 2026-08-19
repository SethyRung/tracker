import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@nuxthub/db";
import {
  categories,
  entries,
  entryWeights,
  recurringTemplates,
  roomMemberships,
} from "hub:db:schema";

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
  const key = options.monthKey ?? monthKey();
  const range = monthRange(key);
  const start = range.start.toDate();
  const end = range.end.toDate();

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
      paidByMembershipId: recurringTemplates.paidByMembershipId,
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
      monthKey: key,
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

    // Prefer the template's configured payer; fall back to the longest-
    // tenured active member when unset or no longer active.
    const payerId =
      t.paidByMembershipId && activeIds.has(t.paidByMembershipId)
        ? t.paidByMembershipId
        : oldestMember.id;

    const templateInput: TemplateSnapshotInput = {
      id: t.id,
      categoryId: t.categoryId,
      currency: t.currency as "USD" | "KHR",
      amountMinor: Number(t.amountMinor),
      memberSnapshot: (t.memberSnapshot ?? []) as TemplateSnapshotInput["memberSnapshot"],
    };

    const planned = planDraftForTemplate(templateInput, activeIds, {
      newEntryId: crypto.randomUUID(),
      roomId: t.roomId,
      createdByUserId: "_recurring_materialize",
      monthStart: start,
      paidByMembershipId: payerId,
    });
    if (!planned) {
      templatesSkipped++;
      continue;
    }

    // `createdByUserId` must reference `user.id` (FK). Templates materialize
    // outside any user's session; attribute it to the payer's user account.
    const payerUser = await db
      .select({ userId: roomMemberships.userId })
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, t.roomId),
          eq(roomMemberships.isActive, true),
          eq(roomMemberships.id, payerId),
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
    });
    draftsCreated++;
  }

  return {
    monthKey: key,
    roomId: options.roomId ?? null,
    draftsCreated,
    templatesProcessed,
    templatesSkipped,
  };
}
