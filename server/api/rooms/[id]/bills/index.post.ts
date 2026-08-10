import { and, eq, inArray } from "drizzle-orm";
import { db } from "hub:db";
import { billWeights, bills, roomMemberships } from "hub:db:schema";
import { createBillSchema } from "~~/shared/schemas/bill";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, createBillSchema.parse);

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
    await tx.insert(bills).values({
      id,
      roomId,
      categoryId: body.categoryId ?? null,
      currency: body.currency,
      amountMinor: body.amountMinor,
      date: body.date,
      paidByMembershipId: body.paidByMembershipId,
      notes: body.notes ?? null,
      status: "draft",
      createdByUserId: ctx.userId,
    });
    if (body.weights.length > 0) {
      await tx.insert(billWeights).values(
        body.weights.map((w) => ({
          billId: id,
          membershipId: w.membershipId,
          weightBps: w.weightBps,
        })),
      );
    }
  });

  const created = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
  const weights = await db.select().from(billWeights).where(eq(billWeights.billId, id));
  const bill = { ...created[0], weights };
  return createResponse({ code: ApiResponseCode.Success }, { bill });
});
