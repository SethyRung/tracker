import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  usdEnabled: z.boolean().optional(),
  khrEnabled: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, bodySchema.parse);

  if (body.usdEnabled === false && body.khrEnabled === false) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Pick at least one currency.",
    });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.usdEnabled !== undefined) updates.usdEnabled = body.usdEnabled;
  if (body.khrEnabled !== undefined) updates.khrEnabled = body.khrEnabled;

  if (Object.keys(updates).length > 0) {
    await db.update(schema.rooms).set(updates).where(eq(schema.rooms.id, roomId));
  }

  const room = await db.query.rooms.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, roomId), isRoomActiveCondition()),
  });

  if (!room) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to update room",
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, room);
});
