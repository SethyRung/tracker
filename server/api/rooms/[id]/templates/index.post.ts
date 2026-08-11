import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories, recurringTemplates } from "hub:db:schema";
import { createTemplateSchema } from "~~/shared/schemas/template";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, createTemplateSchema.parse);

  const cat = await db
    .select({ id: categories.id, recurringType: categories.recurringType })
    .from(categories)
    .where(and(eq(categories.id, body.categoryId), eq(categories.roomId, roomId)))
    .limit(1);
  if (cat.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Category not found in this room.",
    });
  }
  if (cat[0]!.recurringType !== "recurring") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Templates can only be created for recurring categories.",
    });
  }

  // One template per category — enforce at the route layer (DB-level UNIQUE
  // is redundant because category_id references a globally-unique PK).
  const existing = await db
    .select({ id: recurringTemplates.id })
    .from(recurringTemplates)
    .where(eq(recurringTemplates.categoryId, body.categoryId))
    .limit(1);
  if (existing.length > 0) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This category already has a recurring template. Edit the existing one.",
    });
  }

  const id = newId();
  await db.insert(recurringTemplates).values({
    id,
    roomId,
    categoryId: body.categoryId,
    currency: body.currency,
    amountMinor: body.amountMinor,
    dayOfMonth: body.dayOfMonth,
    isActive: body.isActive,
    memberSnapshot: body.memberSnapshot,
  });

  const created = await db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.id, id))
    .limit(1);
  return createResponse({ code: ApiResponseCode.Success }, { template: created[0] });
});
