import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "hub:db";
import { categories, entries, entryWeights, roomMemberships } from "hub:db:schema";
import { createEntrySchema } from "~~/shared/schemas/entry";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, createEntrySchema.parse);

  // User-created entries are always published (instant). Drafts are only
  // materialized by recurring templates (Phase 7), not via this route.
  const status = "published" as const;
  const templateId = body.templateId ?? null;

  const attendeeIds = new Set(body.weights.map((w) => w.membershipId));
  const active = await db
    .select({ id: roomMemberships.id })
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        eq(roomMemberships.isActive, true),
        inArray(roomMemberships.id, [...attendeeIds]),
      ),
    );
  if (active.length !== attendeeIds.size) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "One or more attendees are not active members of this room.",
    });
  }

  // A category with recurringType 'once' allows only one entry per (ICT) month.
  if (body.categoryId) {
    const cat = await db
      .select({ recurringType: categories.recurringType })
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.roomId, roomId)))
      .limit(1);
    if (cat[0]?.recurringType === "once") {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: PHNOM_PENH_TZ,
        year: "numeric",
        month: "2-digit",
      }).formatToParts(body.date);
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      if (y && m) {
        const { start, end } = monthRange(`${y}-${m}`);
        const existing = await db
          .select({ id: entries.id })
          .from(entries)
          .where(
            and(
              eq(entries.roomId, roomId),
              eq(entries.categoryId, body.categoryId),
              gte(entries.date, start) as never,
              lt(entries.date, end) as never,
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          return createResponse({
            code: ApiResponseCode.InvalidRequest,
            message: "This category allows only one entry per month. Edit the existing entry instead.",
          });
        }
      }
    }
  }

  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(entries).values({
      id,
      roomId,
      categoryId: body.categoryId ?? null,
      currency: body.currency,
      amountMinor: body.amountMinor,
      date: body.date,
      paidByMembershipId: body.paidByMembershipId,
      notes: body.notes ?? null,
      status,
      templateId,
      createdByUserId: ctx.userId,
    });
    if (body.weights.length > 0) {
      await tx.insert(entryWeights).values(
        body.weights.map((w) => ({
          entryId: id,
          membershipId: w.membershipId,
          weightBps: w.weightBps,
        })),
      );
    }
  });

  const created = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
  const weights = await db.select().from(entryWeights).where(eq(entryWeights.entryId, id));
  const entry = { ...created[0], weights };
  return createResponse({ code: ApiResponseCode.Success }, { entry });
});