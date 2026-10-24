import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.strictObject({
  nickname: z
    .union(
      [
        z
          .string("Enter a nickname or leave it blank")
          .trim()
          .max(80, "Nickname must be at most 80 characters"),
        z.literal(""),
      ],
      "Enter a nickname or leave it blank",
    )
    .nullable()
    .optional(),
  avatarUrl: z
    .union(
      [z.string("Enter a valid avatar URL").url("Enter a valid avatar URL"), z.literal("")],
      "Enter a valid avatar URL or leave it blank",
    )
    .nullable()
    .optional(),
  color: z
    .string("Pick a color")
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color")
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
