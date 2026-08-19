import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const recurringTypeSchema = z.enum(["unlimited", "once", "recurring"]);

const createCategorySchema = z.object({
  name: z
    .string()
    .max(40)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "Name is required" }),
  sortOrder: z.number().int().min(0).default(0),
  recurringType: recurringTypeSchema.default("unlimited"),
});

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, createCategorySchema.parse);

  const normalized = normalizeCategoryName(body.name);

  const existing = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.roomId, roomId),
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

  const id = newId();
  await db.insert(schema.categories).values({
    id,
    roomId,
    name: body.name.trim(),
    sortOrder: body.sortOrder,
    recurringType: body.recurringType,
  });

  const category = await db.query.categories.findFirst({
    where: (c, { eq }) => eq(c.id, id),
  });
  return createResponse({ code: ApiResponseCode.Success }, { category });
});
