import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { recurringTemplates } from "hub:db:schema";
import { updateTemplateSchema } from "~~/shared/schemas/template";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const tid = getRouterParam(event, "tid");
  if (!roomId || !tid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, updateTemplateSchema.parse);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.dayOfMonth !== undefined) updates.dayOfMonth = body.dayOfMonth;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.memberSnapshot !== undefined) updates.memberSnapshot = body.memberSnapshot;

  await db
    .update(recurringTemplates)
    .set(updates)
    .where(and(eq(recurringTemplates.id, tid), eq(recurringTemplates.roomId, roomId)));

  const updated = await db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.id, tid))
    .limit(1);
  const template = updated[0];
  return createResponse({ code: ApiResponseCode.Success }, { template });
});
