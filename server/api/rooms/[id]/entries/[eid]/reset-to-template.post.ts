import { db } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getEntryId(event);

  const ctx = await requireRoomContext(event, roomId);

  const entry = await findRoomEntry(roomId, eid);
  if (!entry) {
    return createResponse({ code: ApiResponseCode.NotFound, message: "Entry not found" });
  }
  if (!entry.templateId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This entry isn't linked to a recurring template.",
    });
  }

  const isAdmin = ctx.role === "admin";
  const isOwner = entry.createdByUserId === ctx.userId;
  if (!isAdmin && !isOwner) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "Only the creator or an admin can reset this entry.",
    });
  }

  const closed = await closedMonthResponse(roomId, monthKey(entry.date));
  if (closed) return closed;

  const template = await db.query.recurringTemplates.findFirst({
    where: (t, { eq }) => eq(t.id, entry.templateId!),
  });
  if (!template) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "The template for this entry no longer exists.",
    });
  }

  const result = await syncEntryToTemplate(eid, template);
  if (!result) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "No active members left to split this entry between.",
    });
  }

  return createResponse(
    { code: ApiResponseCode.Success },
    { ...result.entry, weights: result.weights },
  );
});
