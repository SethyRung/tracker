import { and, eq, sql } from "drizzle-orm";
import { db } from "hub:db";
import { categories } from "hub:db:schema";
import { createCategorySchema, normalizeCategoryName } from "~~/shared/schemas/category";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) throw createError({ statusCode: 400, statusMessage: "Missing room id" });

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, createCategorySchema.parse);

  const normalized = normalizeCategoryName(body.name);

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.roomId, roomId), sql`lower(trim(${categories.name})) = ${normalized}`))
    .limit(1);
  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: "A category with this name already exists in this room.",
    });
  }

  const id = newId();
  await db.insert(categories).values({
    id,
    roomId,
    name: body.name.trim(),
    sortOrder: body.sortOrder,
  });

  const created = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return { category: created[0] };
});
