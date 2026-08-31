import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const yyyymm = getMonthKeyParam(event);
  if (!isValidMonthKey(yyyymm)) {
    return invalidMonthKeyResponse(yyyymm);
  }

  await requireRoomAdmin(event, roomId);

  const existing = await db.query.monthSnapshots.findFirst({
    where: (s, { eq, and }) => and(eq(s.roomId, roomId), eq(s.yyyymm, yyyymm)),
  });
  if (!existing) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Month is not closed.",
    });
  }

  const now = new Date();
  await db
    .update(schema.monthSnapshots)
    .set({
      status: "open",
      closedAt: null,
      closedByUserId: null,
      updatedAt: now,
    })
    .where(and(eq(schema.monthSnapshots.roomId, roomId), eq(schema.monthSnapshots.yyyymm, yyyymm)));

  const snapshot = await db.query.monthSnapshots.findFirst({
    where: (s, { eq, and }) => and(eq(s.roomId, roomId), eq(s.yyyymm, yyyymm)),
  });
  return createResponse({ code: ApiResponseCode.Success }, snapshot);
});
