import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { inviteLinks, roomMemberships } from "hub:db:schema";
import { z } from "zod";

const joinRoomSchema = z.object({
  token: z.string().min(1).max(64),
  displayName: z.string().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const body = await readValidatedBody(event, joinRoomSchema.parse);

  const tokenHash = await hashToken(body.token);
  const link = await db
    .select()
    .from(inviteLinks)
    .where(eq(inviteLinks.tokenHash, tokenHash))
    .limit(1);

  if (link.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "This invite link is no longer valid.",
    });
  }
  const row = link[0]!;

  if (row.usedAt !== null) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This invite link has already been used.",
    });
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This invite link has expired.",
    });
  }

  const existing = await db
    .select()
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, row.roomId),
        eq(roomMemberships.userId, session.user.id),
        eq(roomMemberships.isActive, true),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Already a member of this room.",
    });
  }

  const usedColors = await db
    .select({ color: roomMemberships.color })
    .from(roomMemberships)
    .where(eq(roomMemberships.roomId, row.roomId));

  const color =
    body.color ?? nextMemberColor(usedColors.map((c) => c.color).filter((c): c is string => !!c));

  const membershipId = newId();
  await db.transaction(async (tx) => {
    await tx.insert(roomMemberships).values({
      id: membershipId,
      roomId: row.roomId,
      userId: session.user.id,
      role: "member",
      displayName: body.displayName,
      color,
      sharePercentBps: Math.floor(10000 / Math.max(1, usedColors.length + 1)),
    });
    await tx
      .update(inviteLinks)
      .set({ usedAt: new Date(), usedByMembershipId: membershipId })
      .where(eq(inviteLinks.tokenHash, tokenHash));
  });

  return createResponse({ code: ApiResponseCode.Success }, { roomId: row.roomId, membershipId });
});
