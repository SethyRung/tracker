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
  if (ctx.role !== "admin") {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "Only an admin can publish a draft entry.",
    });
  }
  if (entry.status === "published") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This entry is already published.",
    });
  }

  const closed = await closedMonthResponse(roomId, monthKey(entry.date));
  if (closed) return closed;

  await db
    .update(schema.entries)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(schema.entries.id, eid));

  const updated = await findRoomEntry(roomId, eid);

  if (!updated) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found after update",
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, updated);
});
