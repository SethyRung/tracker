import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const yyyymm = getMonthKeyParam(event);
  if (!isValidMonthKey(yyyymm)) {
    return invalidMonthKeyResponse(yyyymm);
  }

  const ctx = await requireRoomAdmin(event, roomId);

  const existing = await db.query.monthSnapshots.findFirst({
    where: (s, { eq, and }) => and(eq(s.roomId, roomId), eq(s.yyyymm, yyyymm)),
  });

  const now = new Date();
  if (!existing) {
    await db.insert(schema.monthSnapshots).values({
      id: newId(),
      roomId,
      yyyymm,
      status: "closed",
      closedAt: now,
      closedByUserId: ctx.userId,
    });
  } else {
    await db
      .update(schema.monthSnapshots)
      .set({
        status: "closed",
        closedAt: now,
        closedByUserId: ctx.userId,
        updatedAt: now,
      })
      .where(
        and(eq(schema.monthSnapshots.roomId, roomId), eq(schema.monthSnapshots.yyyymm, yyyymm)),
      );
  }

  const snapshot = await db.query.monthSnapshots.findFirst({
    where: (s, { eq, and }) => and(eq(s.roomId, roomId), eq(s.yyyymm, yyyymm)),
  });
  return createResponse({ code: ApiResponseCode.Success }, snapshot);
});
