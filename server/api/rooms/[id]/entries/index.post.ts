import { and, eq, inArray } from "drizzle-orm";
import { db } from "hub:db";
import { entries, entryWeights, roomMemberships } from "hub:db:schema";
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