import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { recurringTemplates } from "hub:db:schema";

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

  await db
    .delete(recurringTemplates)
    .where(and(eq(recurringTemplates.id, tid), eq(recurringTemplates.roomId, roomId)));

  // Drafts already materialized from this template keep their data but lose
  // the template_id link (ON DELETE SET NULL). Admin can publish them as-is
  // or delete them; the next month's cron won't create new drafts.
  return createResponse({ code: ApiResponseCode.Success }, { ok: true });
});
