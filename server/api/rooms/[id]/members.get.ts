import { db } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);

  const members = await db.query.roomMemberships.findMany({
    where: (m, { eq, and }) => and(eq(m.roomId, roomId), eq(m.isActive, true)),
    orderBy: (m) => m.joinedAt,
  });

  return createResponse({ code: ApiResponseCode.Success }, members);
});
