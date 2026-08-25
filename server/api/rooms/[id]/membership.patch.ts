import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.strictObject({
  nickname: z
    .union([z.string().trim().max(80), z.literal("")])
    .nullable()
    .optional(),
  avatarUrl: z
    .union([z.string().url(), z.literal("")])
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, bodySchema.parse);

  const updates: Record<string, unknown> = {};
  if (body.nickname !== undefined) updates.nickname = body.nickname === "" ? null : body.nickname;
  if (body.avatarUrl !== undefined)
    updates.avatarUrl = body.avatarUrl === "" ? null : body.avatarUrl;
  if (body.color !== undefined) updates.color = body.color;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.roomMemberships)
      .set(updates)
      .where(
        and(
          eq(schema.roomMemberships.id, ctx.membership.id),
          eq(schema.roomMemberships.roomId, roomId),
        ),
      );
  }

  const member = await db.query.roomMemberships.findFirst({
    where: (m, { eq }) => eq(m.id, ctx.membership.id),
  });

  return createResponse({ code: ApiResponseCode.Success }, member);
});
