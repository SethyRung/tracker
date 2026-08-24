import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const rooms = await db.select().from(schema.rooms).where(eq(schema.rooms.id, roomId)).limit(1);
  const room = rooms[0];
  if (!room) {
    throw createError({ statusCode: 404, statusMessage: "Room not found" });
  }

  if (isRoomActive(room)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Room is not deleted.",
    });
  }

  if (isPurgeEligible(room, new Date(), ROOM_PURGE_AFTER_DAYS)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Restore window has expired.",
    });
  }

  const callerAdmin = await db
    .select({ id: schema.roomMemberships.id })
    .from(schema.roomMemberships)
    .where(
      and(
        eq(schema.roomMemberships.roomId, roomId),
        eq(schema.roomMemberships.userId, userId),
        eq(schema.roomMemberships.role, "admin"),
      ),
    )
    .limit(1);

  if (!callerAdmin[0]) {
    throw createError({ statusCode: 403, statusMessage: "Admin access required" });
  }

  const memberships = await db
    .select({ id: schema.roomMemberships.id, leftAt: schema.roomMemberships.leftAt })
    .from(schema.roomMemberships)
    .where(eq(schema.roomMemberships.roomId, roomId));

  const cohortIds = memberships
    .filter((m) => wasArchivedByRoomDelete(m, room.deletedAt, ROOM_DELETE_ARCHIVE_TOLERANCE_MS))
    .map((m) => m.id);

  if (cohortIds.length > 0) {
    await db
      .update(schema.roomMemberships)
      .set({ isActive: true, leftAt: null })
      .where(inArray(schema.roomMemberships.id, cohortIds));
  }

  await db
    .update(schema.rooms)
    .set({ deletedAt: null, deletedByUserId: null })
    .where(eq(schema.rooms.id, roomId));

  return createResponse({ code: ApiResponseCode.Success }, { restored: true });
});
