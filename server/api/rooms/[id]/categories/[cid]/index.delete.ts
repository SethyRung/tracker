import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const cid = getRouterParam(event, "cid");
  if (!cid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  await requireRoomAdmin(event, roomId);

  await db
    .delete(schema.categories)
    .where(and(eq(schema.categories.id, cid), eq(schema.categories.roomId, roomId)));

  return createResponse({ code: ApiResponseCode.Success }, { ok: true });
});
