import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories, recurringTemplates, roomMemberships } from "hub:db:schema";
import { createTemplateSchema } from "~~/shared/schemas/template";
import { materializeRecurringDrafts, currentMonthKeyPhnomPenh } from "~~/server/utils/recurring";

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

  // A configured payer must be an active member of this room.
  if (body.paidByMembershipId) {
    const payer = await db
      .select({ id: roomMemberships.id })
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.id, body.paidByMembershipId),
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.isActive, true),
        ),
      )
      .limit(1);
    if (payer.length === 0) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Payer must be an active member of this room.",
      });
    }
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
    paidByMembershipId: body.paidByMembershipId ?? null,
    memberSnapshot: body.memberSnapshot,
  });

  // Materialize this month's entry immediately instead of waiting for the
  // 1st-of-month cron. A template created mid-month would otherwise contribute
  // nothing to the current month's settlement. Idempotent, so this is a no-op
  // if the entry already exists.
  if (body.isActive) {
    try {
      await materializeRecurringDrafts({ roomId, monthKey: currentMonthKeyPhnomPenh() });
    } catch (e) {
      // The template itself saved fine; the cron will retry on the 1st.
      console.error("[templates.post] immediate materialization failed", e);
    }
  }

  const created = await db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.id, id))
    .limit(1);
  return createResponse({ code: ApiResponseCode.Success }, { template: created[0] });
});
