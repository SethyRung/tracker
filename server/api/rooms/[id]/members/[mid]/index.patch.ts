import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";
import { updateMemberSchema } from "~~/shared/schemas/room";
import { requireRoomContext } from "~~/server/utils/room";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const mid = getRouterParam(event, "mid");
  if (!roomId || !mid) throw createError({ statusCode: 400, statusMessage: "Missing id" });

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateMemberSchema.parse);

  const isSelf = ctx.membership.id === mid;
  const isAdmin = ctx.role === "admin";
  if (!isSelf && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Cannot update other members" });
  }

  const updates: Record<string, unknown> = {};
  if (body.displayName !== undefined && isAdmin) updates.displayName = body.displayName;
  if (body.nickname !== undefined) updates.nickname = body.nickname;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.color !== undefined) updates.color = body.color;
  if (body.sharePercentBps !== undefined) updates.sharePercentBps = body.sharePercentBps;

  if (Object.keys(updates).length > 0) {
    await db
      .update(roomMemberships)
      .set(updates)
      .where(and(eq(roomMemberships.id, mid), eq(roomMemberships.roomId, roomId)));
  }

  const updated = await db
    .select()
    .from(roomMemberships)
    .where(eq(roomMemberships.id, mid))
    .limit(1);
  return { member: updated[0] };
});
