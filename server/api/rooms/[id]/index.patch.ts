import { eq } from "drizzle-orm";
import { db } from "hub:db";
import { rooms } from "hub:db:schema";
import { updateRoomSchema } from "~~/shared/schemas/room";
import { requireRoomAdmin } from "~~/server/utils/room";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) throw createError({ statusCode: 400, statusMessage: "Missing room id" });

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, updateRoomSchema.parse);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.usdEnabled !== undefined) updates.usdEnabled = body.usdEnabled;
  if (body.khrEnabled !== undefined) updates.khrEnabled = body.khrEnabled;

  if (Object.keys(updates).length > 0) {
    await db.update(rooms).set(updates).where(eq(rooms.id, roomId));
  }

  const updated = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  return { room: updated[0] };
});
