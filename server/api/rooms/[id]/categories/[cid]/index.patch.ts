import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "hub:db";
import { categories } from "hub:db:schema";
import { normalizeCategoryName, updateCategorySchema } from "~~/shared/schemas/category";

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
  const body = await readValidatedBody(event, updateCategorySchema.parse);

  if (body.name !== undefined) {
    const normalized = normalizeCategoryName(body.name);
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.roomId, roomId),
          ne(categories.id, cid),
          sql`lower(trim(${categories.name})) = ${normalized}`,
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "A category with this name already exists in this room.",
      });
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  if (Object.keys(updates).length > 0) {
    await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, cid), eq(categories.roomId, roomId)));
  }

  const updated = await db.select().from(categories).where(eq(categories.id, cid)).limit(1);
  const category = updated[0];
  return createResponse({ code: ApiResponseCode.Success }, { category });
});
