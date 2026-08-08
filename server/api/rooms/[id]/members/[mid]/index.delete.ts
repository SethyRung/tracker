import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";
import { promoteAdminOnDeparture, requireRoomAdmin } from "~~/server/utils/room";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const mid = getRouterParam(event, "mid");
  if (!roomId || !mid) throw createError({ statusCode: 400, statusMessage: "Missing id" });

  await requireRoomAdmin(event, roomId);

  const target = await db
    .select()
    .from(roomMemberships)
    .where(and(eq(roomMemberships.id, mid), eq(roomMemberships.roomId, roomId)))
    .limit(1);
  if (target.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Member not found" });
  }

  const wasAdmin = target[0]!.role === "admin";

  await db
    .update(roomMemberships)
    .set({ isActive: false, leftAt: new Date() })
    .where(eq(roomMemberships.id, mid));

  let promoted: string | null = null;
  if (wasAdmin) {
    promoted = await promoteAdminOnDeparture(roomId);
  }

  return { ok: true, promotedMembershipId: promoted };
});
