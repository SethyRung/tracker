import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const tid = getTemplateId(event);

  await requireRoomAdmin(event, roomId);

  await db
    .delete(schema.recurringTemplates)
    .where(
      and(eq(schema.recurringTemplates.id, tid), eq(schema.recurringTemplates.roomId, roomId)),
    );

  return createResponse({ code: ApiResponseCode.Success }, true);
});
