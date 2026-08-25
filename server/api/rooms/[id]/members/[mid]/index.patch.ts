import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const updateMemberSchema = z.object({
  nickname: z.string().max(80).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  sharePercentBps: z.number().int().min(0).max(10000).optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const mid = getRouterParam(event, "mid");
  if (!mid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateMemberSchema.parse);

  const isSelf = ctx.membership.id === mid;
  const isAdmin = ctx.role === "admin";
  if (!isSelf && !isAdmin) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "Cannot update other members",
    });
  }

  const updates: Record<string, unknown> = {};
  if (body.nickname !== undefined) updates.nickname = body.nickname;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.color !== undefined) updates.color = body.color;
  if (body.sharePercentBps !== undefined) updates.sharePercentBps = body.sharePercentBps;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.roomMemberships)
      .set(updates)
      .where(and(eq(schema.roomMemberships.id, mid), eq(schema.roomMemberships.roomId, roomId)));
  }

  const member = await db.query.roomMemberships.findFirst({
    where: (m, { eq }) => eq(m.id, mid),
  });
  return createResponse({ code: ApiResponseCode.Success }, member);
});
