import { and, eq, inArray } from "drizzle-orm";
import { db } from "hub:db";
import { billWeights, bills, roomMemberships } from "hub:db:schema";
import { ApiResponseCode, type ApiResponse } from "#shared/types/response";
import { updateBillSchema } from "~~/shared/schemas/bill";

interface BillShape {
  id: string;
  roomId: string;
  categoryId: string | null;
  currency: "USD" | "KHR";
  amountMinor: number;
  date: Date;
  paidByMembershipId: string;
  notes: string | null;
  status: "draft" | "published";
  templateId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface BillWithWeights extends BillShape {
  weights: { billId: string; membershipId: string; weightBps: number }[];
}
interface UpdateBillResponse {
  bill: BillWithWeights;
}

export default defineEventHandler(async (event): Promise<ApiResponse<UpdateBillResponse>> => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateBillSchema.parse);

  const current = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, bid), eq(bills.roomId, roomId)))
    .limit(1);
  if (current.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Bill not found",
    });
  }
  const bill = current[0]!;

  const isAdmin = ctx.role === "admin";
  const isDraft = bill.status === "draft";
  const isOwner = bill.createdByUserId === ctx.userId;
  if (!isAdmin && !(isDraft && isOwner)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "Only the creator can edit a draft; only admins can edit a published bill.",
    });
  }

  if (body.weights && body.weights.length > 0) {
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
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.date !== undefined) updates.date = body.date;
  if (body.paidByMembershipId !== undefined) updates.paidByMembershipId = body.paidByMembershipId;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  await db.transaction(async (tx) => {
    if (Object.keys(updates).length > 1) {
      await tx.update(bills).set(updates).where(eq(bills.id, bid));
    }
    if (body.weights) {
      await tx.delete(billWeights).where(eq(billWeights.billId, bid));
      if (body.weights.length > 0) {
        await tx.insert(billWeights).values(
          body.weights.map((w) => ({
            billId: bid,
            membershipId: w.membershipId,
            weightBps: w.weightBps,
          })),
        );
      }
    }
  });

  const updated = await db.select().from(bills).where(eq(bills.id, bid)).limit(1);
  const weights = await db.select().from(billWeights).where(eq(billWeights.billId, bid));
  const result = { ...updated[0], weights } as BillWithWeights;
  return createResponse({ code: ApiResponseCode.Success }, { bill: result });
});