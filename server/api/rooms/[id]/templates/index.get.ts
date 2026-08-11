import { eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories, recurringTemplates } from "hub:db:schema";

// Members can view templates (so they know what drafts will be created).
// Editing is admin-only via POST/PATCH/DELETE.
export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  await requireRoomContext(event, roomId);

  const rows = await db
    .select({
      id: recurringTemplates.id,
      roomId: recurringTemplates.roomId,
      categoryId: recurringTemplates.categoryId,
      categoryName: categories.name,
      currency: recurringTemplates.currency,
      amountMinor: recurringTemplates.amountMinor,
      dayOfMonth: recurringTemplates.dayOfMonth,
      isActive: recurringTemplates.isActive,
      memberSnapshot: recurringTemplates.memberSnapshot,
      createdAt: recurringTemplates.createdAt,
      updatedAt: recurringTemplates.updatedAt,
    })
    .from(recurringTemplates)
    .innerJoin(categories, eq(categories.id, recurringTemplates.categoryId))
    .where(eq(recurringTemplates.roomId, roomId));

  return createResponse({ code: ApiResponseCode.Success }, { templates: rows });
});
