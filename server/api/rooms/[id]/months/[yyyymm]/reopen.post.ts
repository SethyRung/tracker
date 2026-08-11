import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { monthSnapshots } from "hub:db:schema";
import { isValidMonthKey } from "~~/shared/types/date";

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

  await requireRoomAdmin(event, roomId);

  const existing = await db
    .select()
    .from(monthSnapshots)
    .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)))
    .limit(1);
  if (existing.length === 0) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Month is not closed.",
    });
  }

  const now = new Date();
  await db
    .update(monthSnapshots)
    .set({
      status: "open",
      closedAt: null,
      closedByUserId: null,
      updatedAt: now,
    })
    .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)));

  const updated = await db
    .select()
    .from(monthSnapshots)
    .where(and(eq(monthSnapshots.roomId, roomId), eq(monthSnapshots.yyyymm, yyyymm)))
    .limit(1);
  return createResponse({ code: ApiResponseCode.Success }, { snapshot: updated[0] });
});
