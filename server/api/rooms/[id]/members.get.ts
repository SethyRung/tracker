import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  await requireRoomContext(event, roomId);

  const members = await db
    .select()
    .from(roomMemberships)
    .where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.isActive, true)))
    .orderBy(roomMemberships.joinedAt);

  return createResponse({ code: ApiResponseCode.Success }, { members });
});
