import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";
import { z } from "zod";

const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
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
  const roomId = getRouterParam(event, "id");
  const mid = getRouterParam(event, "mid");
  if (!roomId || !mid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
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
  if (body.displayName !== undefined && isAdmin) updates.displayName = body.displayName;
  if (body.nickname !== undefined) updates.nickname = body.nickname;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.color !== undefined) updates.color = body.color;
  if (body.sharePercentBps !== undefined) updates.sharePercentBps = body.sharePercentBps;

  if (Object.keys(updates).length > 0) {
    await db
      .update(roomMemberships)
      .set(updates)
      .where(and(eq(roomMemberships.id, mid), eq(roomMemberships.roomId, roomId)));
  }

  const updated = await db
    .select()
    .from(roomMemberships)
    .where(eq(roomMemberships.id, mid))
    .limit(1);
  const member = updated[0];
  return createResponse({ code: ApiResponseCode.Success }, { member });
});
