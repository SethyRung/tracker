import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const recurringTypeSchema = z.enum(["unlimited", "once", "recurring"]);

const updateCategorySchema = z.object({
  name: z
    .string()
    .max(40)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "Name is required" })
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  recurringType: recurringTypeSchema.optional(),
});

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const cid = getRouterParam(event, "cid");
  if (!cid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, updateCategorySchema.parse);

  if (body.name !== undefined) {
    const normalized = normalizeCategoryName(body.name);
    const existing = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.roomId, roomId),
          ne(schema.categories.id, cid),
          sql`lower(trim(${schema.categories.name})) = ${normalized}`,
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
  if (body.recurringType !== undefined) updates.recurringType = body.recurringType;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.categories)
      .set(updates)
      .where(and(eq(schema.categories.id, cid), eq(schema.categories.roomId, roomId)));
  }

  const category = await db.query.categories.findFirst({
    where: (c, { eq }) => eq(c.id, cid),
  });
  return createResponse({ code: ApiResponseCode.Success }, { category });
});
