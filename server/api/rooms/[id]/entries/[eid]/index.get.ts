import { db } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getRouterParam(event, "eid");
  if (!eid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  await requireRoomContext(event, roomId);

  const entry = await db.query.entries.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, eid), eq(e.roomId, roomId)),
  });
  if (!entry) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }

  const weights = await db.query.entryWeights.findMany({
    where: (w, { eq }) => eq(w.entryId, eid),
  });

  return createResponse({ code: ApiResponseCode.Success }, { ...entry, weights });
});
