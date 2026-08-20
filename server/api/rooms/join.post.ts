import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(1).max(64),
  displayName: z.string().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  const tokenHash = await hashToken(body.token);
  const link = await db.query.inviteLinks.findFirst({
    where: (l, { eq }) => eq(l.tokenHash, tokenHash),
  });

  if (!link) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "This invite link is no longer valid.",
    });
  }
  const row = link;

  if (row.usedAt !== null) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This invite link has already been used.",
    });
  }

  if (now().isAfter(row.expiresAt)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This invite link has expired.",
    });
  }

  const existing = await db.query.roomMemberships.findFirst({
    where: (m, { eq, and }) =>
      and(eq(m.roomId, row.roomId), eq(m.userId, session.user.id), eq(m.isActive, true)),
  });

  if (existing) {
    return createResponse(
      { code: ApiResponseCode.Success },
      { roomId: row.roomId, membershipId: existing.id, alreadyMember: true },
    );
  }

  const usedColors = await db.query.roomMemberships.findMany({
    columns: { color: true },
    where: (m, { eq }) => eq(m.roomId, row.roomId),
  });

  const color =
    body.color ?? nextMemberColor(usedColors.map((c) => c.color).filter((c): c is string => !!c));

  const membershipId = newId();
  await db.insert(schema.roomMemberships).values({
    id: membershipId,
    roomId: row.roomId,
    userId: session.user.id,
    role: "member",
    displayName: body.displayName,
    color,
    sharePercentBps: Math.floor(10000 / Math.max(1, usedColors.length + 1)),
  });
  await db
    .update(schema.inviteLinks)
    .set({ usedAt: new Date(), usedByMembershipId: membershipId })
    .where(eq(schema.inviteLinks.tokenHash, tokenHash));

  return createResponse({ code: ApiResponseCode.Success }, { roomId: row.roomId, membershipId });
});
