import { eq, and } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";
import { requireRoomContext } from "~~/server/utils/room";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) throw createError({ statusCode: 400, statusMessage: "Missing room id" });

  await requireRoomContext(event, roomId);

  const members = await db
    .select()
    .from(roomMemberships)
    .where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.isActive, true)))
    .orderBy(roomMemberships.joinedAt);

  return { members };
});
