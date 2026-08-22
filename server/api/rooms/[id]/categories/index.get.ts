import { db } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);

  const rows = await db.query.categories.findMany({
    where: (c, { eq }) => eq(c.roomId, roomId),
    orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
  });

  return createResponse({ code: ApiResponseCode.Success }, rows);
});
