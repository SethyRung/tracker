import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

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

export async function materializeRecurringDrafts(
  options: MaterializeOptions = {},
): Promise<MaterializeResult> {
  const key = options.monthKey ?? monthKey();
  const range = monthRange(key);
  const start = range.start.toDate();
  const end = range.end.toDate();

  const templateRows = await db
    .select({
      id: schema.recurringTemplates.id,
      roomId: schema.recurringTemplates.roomId,
      categoryId: schema.recurringTemplates.categoryId,
      currency: schema.recurringTemplates.currency,
      amountMinor: schema.recurringTemplates.amountMinor,
      paidByMembershipId: schema.recurringTemplates.paidByMembershipId,
      memberSnapshot: schema.recurringTemplates.memberSnapshot,
    })
    .from(schema.recurringTemplates)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.recurringTemplates.categoryId))
    .innerJoin(schema.rooms, eq(schema.rooms.id, schema.recurringTemplates.roomId))
    .where(
      and(
        eq(schema.recurringTemplates.isActive, true),
        eq(schema.categories.recurringType, "recurring"),
        isRoomActiveCondition(),
        options.roomId ? eq(schema.recurringTemplates.roomId, options.roomId) : undefined,
      ),
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
  const memberRows = await db
    .select({
      id: schema.roomMemberships.id,
      userId: schema.roomMemberships.userId,
      roomId: schema.roomMemberships.roomId,
    })
    .from(schema.roomMemberships)
    .where(
      and(
        inArray(schema.roomMemberships.roomId, roomIds),
        eq(schema.roomMemberships.isActive, true),
      ),
    )
    .orderBy(schema.roomMemberships.joinedAt);

  const membersByRoom = new Map<string, Array<{ id: string; userId: string }>>();
  for (const row of memberRows) {
    const list = membersByRoom.get(row.roomId) ?? [];
    list.push({ id: row.id, userId: row.userId });
    membersByRoom.set(row.roomId, list);
  }

  const existingDraftRows = await db
    .select({ templateId: schema.entries.templateId, date: schema.entries.date })
    .from(schema.entries)
    .where(
      options.roomId
        ? and(
            gte(schema.entries.date, start) as never,
            lt(schema.entries.date, end) as never,
            eq(schema.entries.roomId, options.roomId),
          )
        : and(gte(schema.entries.date, start) as never, lt(schema.entries.date, end) as never),
    );

  let draftsCreated = 0;
  let templatesSkipped = 0;

  for (const t of templateRows) {
    const roomMembers = membersByRoom.get(t.roomId) ?? [];
    const oldestMember = roomMembers[0];
    if (!oldestMember) {
      templatesSkipped++;
      continue;
    }

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

    const activeIds = new Set(roomMembers.map((m) => m.id));
    const payer =
      t.paidByMembershipId && activeIds.has(t.paidByMembershipId)
        ? roomMembers.find((m) => m.id === t.paidByMembershipId)
        : oldestMember;
    if (!payer) {
      templatesSkipped++;
      continue;
    }

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
      paidByMembershipId: payer.id,
    });
    if (!planned) {
      templatesSkipped++;
      continue;
    }

    await db.insert(schema.entries).values({
      ...planned.draft,
      createdByUserId: payer.userId,
    });
    await db.insert(schema.entryWeights).values(
      planned.weights.map((w) => ({
        entryId: planned.draft.id,
        membershipId: w.membershipId,
        weightBps: w.weightBps,
      })),
    );
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

export interface TemplateRef {
  id: string;
  roomId: string;
  currency: "USD" | "KHR";
  amountMinor: number;
  paidByMembershipId: string | null;
  memberSnapshot: Array<{ membershipId: string; weightBps: number }>;
}

export async function findCurrentMonthEntryForTemplate(
  roomId: string,
  templateId: string,
): Promise<{ id: string } | null> {
  const range = monthRange(monthKey());
  const row = await db.query.entries.findFirst({
    columns: { id: true },
    where: (e, { and, eq, gte, lt }) =>
      and(
        eq(e.roomId, roomId),
        eq(e.templateId, templateId),
        gte(e.date, range.start.toDate()) as never,
        lt(e.date, range.end.toDate()) as never,
      ),
  });
  return row ?? null;
}

export async function syncEntryToTemplate(
  entryId: string,
  template: TemplateRef,
): Promise<{
  entry: NonNullable<Awaited<ReturnType<typeof db.query.entries.findFirst>>>;
  weights: Array<{ membershipId: string; weightBps: number }>;
} | null> {
  const activeMembers = await db
    .select({ id: schema.roomMemberships.id })
    .from(schema.roomMemberships)
    .where(
      and(
        eq(schema.roomMemberships.roomId, template.roomId),
        eq(schema.roomMemberships.isActive, true),
      ),
    )
    .orderBy(schema.roomMemberships.joinedAt);

  const activeIds = new Set(activeMembers.map((m) => m.id));
  if (activeIds.size === 0) return null;

  const pruned = pruneSnapshot(template.memberSnapshot, activeIds);
  if (!pruned) return null;

  const oldest = activeMembers[0];
  const payerId =
    template.paidByMembershipId && activeIds.has(template.paidByMembershipId)
      ? template.paidByMembershipId
      : (oldest?.id ?? null);
  if (!payerId) return null;

  await db
    .update(schema.entries)
    .set({
      currency: template.currency,
      amountMinor: template.amountMinor,
      paidByMembershipId: payerId,
      updatedAt: new Date(),
    })
    .where(eq(schema.entries.id, entryId));

  await replaceEntryWeights(entryId, pruned);

  const entry = await db.query.entries.findFirst({ where: (e, { eq }) => eq(e.id, entryId) });
  const weights = await findEntryWeights(entryId);
  if (!entry) return null;
  return { entry, weights: weights as Array<{ membershipId: string; weightBps: number }> };
}
