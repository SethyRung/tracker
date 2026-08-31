import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const cid = getCategoryId(event);

  await requireRoomAdmin(event, roomId);

  await db
    .delete(schema.categories)
    .where(and(eq(schema.categories.id, cid), eq(schema.categories.roomId, roomId)));

  return createResponse({ code: ApiResponseCode.Success }, { ok: true });
});
