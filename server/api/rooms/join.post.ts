import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.object({
  token: z
    .string("Paste your invite code or link")
    .min(1, "Paste your invite code or link")
    .max(64, "This invite code is too long"),
  color: z
    .string("Pick a color")
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color")
    .optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  const found = await findValidInvite(body.token);
  if (!found.ok) {
    return createResponse({ code: found.code, message: found.message });
  }
  const { link } = found;

  const existing = await db.query.roomMemberships.findFirst({
    where: (m, { eq, and }) =>
      and(eq(m.roomId, link.roomId), eq(m.userId, session.user.id), eq(m.isActive, true)),
  });

  if (existing) {
    return createResponse(
      { code: ApiResponseCode.Success },
      { roomId: link.roomId, membershipId: existing.id, alreadyMember: true },
    );
  }

  const usedColors = await db.query.roomMemberships.findMany({
    columns: { color: true },
    where: (m, { eq }) => eq(m.roomId, link.roomId),
  });

  const color =
    body.color ?? nextMemberColor(usedColors.map((c) => c.color).filter((c): c is string => !!c));

  const membershipId = newId();
  await db.insert(schema.roomMemberships).values({
    id: membershipId,
    roomId: link.roomId,
    userId: session.user.id,
    role: "member",
    color,
    sharePercentBps: Math.floor(10000 / Math.max(1, usedColors.length + 1)),
  });
  await db
    .update(schema.inviteLinks)
    .set({ usedAt: new Date(), usedByMembershipId: membershipId })
    .where(eq(schema.inviteLinks.tokenHash, link.tokenHash));

  return createResponse({ code: ApiResponseCode.Success }, { roomId: link.roomId, membershipId });
});
