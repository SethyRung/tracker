import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { monthSnapshots } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const yyyymm = getRouterParam(event, "yyyymm");
  if (!roomId || !yyyymm) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }
  if (!isValidMonthKey(yyyymm)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: `Invalid month key: ${yyyymm}`,
    });
  }

  const ctx = await requireRoomAdmin(event, roomId);

  const existing = await db
    .select()
    .from(monthSnapshots)
    .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)))
    .limit(1);

  const now = new Date();
  if (existing.length === 0) {
    await db.insert(monthSnapshots).values({
      id: newId(),
      roomId,
      yyyymm,
      status: "closed",
      closedAt: now,
      closedByUserId: ctx.userId,
    });
  } else {
    await db
      .update(monthSnapshots)
      .set({
        status: "closed",
        closedAt: now,
        closedByUserId: ctx.userId,
        updatedAt: now,
      })
      .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)));
  }

  const updated = await db
    .select()
    .from(monthSnapshots)
    .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)))
    .limit(1);
  return createResponse({ code: ApiResponseCode.Success }, { snapshot: updated[0] });
});
