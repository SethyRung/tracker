import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const ctx = await requireRoomAdmin(event, roomId);

  const activeMembers = await db
    .select({ id: schema.roomMemberships.id })
    .from(schema.roomMemberships)
    .where(
      and(eq(schema.roomMemberships.roomId, roomId), eq(schema.roomMemberships.isActive, true)),
    );

  if (!canDeleteRoom(activeMembers, ctx.membership.id)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Remove the other members first.",
    });
  }

  const deletedAt = new Date();

  await db
    .update(schema.rooms)
    .set({ deletedAt, deletedByUserId: ctx.userId })
    .where(eq(schema.rooms.id, roomId));

  await db
    .update(schema.roomMemberships)
    .set({ isActive: false, leftAt: deletedAt })
    .where(
      and(eq(schema.roomMemberships.roomId, roomId), eq(schema.roomMemberships.isActive, true)),
    );

  return createResponse({ code: ApiResponseCode.Success }, { deletedAt });
});
