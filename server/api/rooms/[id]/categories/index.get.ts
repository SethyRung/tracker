import { asc, eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) throw createError({ statusCode: 400, statusMessage: "Missing room id" });

  await requireRoomContext(event, roomId);

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.roomId, roomId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return { categories: rows };
});
