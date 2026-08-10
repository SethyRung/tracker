import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { bills } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) throw createError({ statusCode: 400, statusMessage: "Missing id" });

  const ctx = await requireRoomContext(event, roomId);

  const current = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, bid), eq(bills.roomId, roomId)))
    .limit(1);
  if (current.length === 0) throw createError({ statusCode: 404, statusMessage: "Bill not found" });
  const bill = current[0]!;

  const isAdmin = ctx.role === "admin";
  const isDraft = bill.status === "draft";
  const isOwner = bill.createdByUserId === ctx.userId;
  if (!isAdmin && !(isDraft && isOwner)) {
    throw createError({
      statusCode: 403,
      statusMessage:
        "Only the creator can delete a draft; only admins can delete a published bill.",
    });
  }

  await db.delete(bills).where(eq(bills.id, bid));
  return { ok: true };
});
