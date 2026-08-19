import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getRouterParam(event, "eid");
  if (!eid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const ctx = await requireRoomContext(event, roomId);

  const entry = await db.query.entries.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, eid), eq(e.roomId, roomId)),
  });
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

  try {
    await assertMonthOpen(roomId, monthKeyFromDate(entry.date));
  } catch (e) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: e instanceof Error ? e.message : "Month is closed.",
    });
  }

  await db
    .update(schema.entries)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(schema.entries.id, eid));

  const updated = await db.query.entries.findFirst({
    where: (e, { eq }) => eq(e.id, eid),
  });

  if (!updated) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found after update",
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, updated);
});
