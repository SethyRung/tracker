import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

interface EntryShape {
  id: string;
  roomId: string;
  date: Date;
  status: "draft" | "published";
  createdByUserId: string;
}

function canMutate(entry: EntryShape, isAdmin: boolean, isOwner: boolean) {
  if (isAdmin) return true;
  if (entry.status === "published") return isOwner;
  return false;
}

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
  const isAdmin = ctx.role === "admin";
  const isOwner = entry.createdByUserId === ctx.userId;
  if (!canMutate(entry, isAdmin, isOwner)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message:
        entry.status === "draft"
          ? "Only an admin can delete a draft entry."
          : "Only the creator or an admin can delete this entry.",
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

  await db.delete(schema.entries).where(eq(schema.entries.id, eid));

  return createResponse({ code: ApiResponseCode.Success }, true);
});
