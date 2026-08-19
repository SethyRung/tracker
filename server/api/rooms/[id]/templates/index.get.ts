import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);

  const rows = await db
    .select({
      id: schema.recurringTemplates.id,
      roomId: schema.recurringTemplates.roomId,
      categoryId: schema.recurringTemplates.categoryId,
      categoryName: schema.categories.name,
      currency: schema.recurringTemplates.currency,
      amountMinor: schema.recurringTemplates.amountMinor,
      dayOfMonth: schema.recurringTemplates.dayOfMonth,
      isActive: schema.recurringTemplates.isActive,
      paidByMembershipId: schema.recurringTemplates.paidByMembershipId,
      memberSnapshot: schema.recurringTemplates.memberSnapshot,
      createdAt: schema.recurringTemplates.createdAt,
      updatedAt: schema.recurringTemplates.updatedAt,
    })
    .from(schema.recurringTemplates)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.recurringTemplates.categoryId))
    .where(eq(schema.recurringTemplates.roomId, roomId));

  return createResponse({ code: ApiResponseCode.Success }, rows);
});
