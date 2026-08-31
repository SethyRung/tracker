import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getEntryId(event);

  const ctx = await requireRoomContext(event, roomId);

  const entry = await findRoomEntry(roomId, eid);
  if (!entry) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }
  if (!canMutateEntry(entry, ctx)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: entryMutationForbiddenMessage(entry.status, "delete"),
    });
  }

  const closed = await closedMonthResponse(roomId, monthKey(entry.date));
  if (closed) return closed;

  await db.delete(schema.entries).where(eq(schema.entries.id, eid));

  return createResponse({ code: ApiResponseCode.Success }, true);
});
