import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const mid = getMembershipId(event);

  await requireRoomAdmin(event, roomId);

  const target = await db.query.roomMemberships.findFirst({
    where: (m, { eq, and }) => and(eq(m.id, mid), eq(m.roomId, roomId)),
  });
  if (!target) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Member not found",
    });
  }

  const wasAdmin = target.role === "admin";

  let promoted: string | null = null;
  if (wasAdmin) {
    promoted = await promoteAdminOnDeparture(roomId);
  }

  await db
    .update(schema.roomMemberships)
    .set({ isActive: false, leftAt: new Date() })
    .where(eq(schema.roomMemberships.id, mid));

  return createResponse(
    { code: ApiResponseCode.Success },
    { ok: true, promotedMembershipId: promoted },
  );
});
