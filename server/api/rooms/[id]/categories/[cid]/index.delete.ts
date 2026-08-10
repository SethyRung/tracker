import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const cid = getRouterParam(event, "cid");
  if (!roomId || !cid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  await requireRoomAdmin(event, roomId);

  await db.delete(categories).where(and(eq(categories.id, cid), eq(categories.roomId, roomId)));

  return createResponse({ code: ApiResponseCode.Success }, { ok: true });
});
