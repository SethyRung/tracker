import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { bills } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);

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
      message: "Only the creator can delete a draft; only admins can delete a published bill.",
    });
  }

  await db.delete(bills).where(eq(bills.id, bid));
  return createResponse({ code: ApiResponseCode.Success }, { ok: true });
});
