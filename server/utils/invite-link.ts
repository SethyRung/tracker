import { db, schema } from "@nuxthub/db";

type InviteLookup =
  | {
      ok: true;
      link: NonNullable<Awaited<ReturnType<typeof db.query.inviteLinks.findFirst>>>;
      room: NonNullable<Awaited<ReturnType<typeof db.query.rooms.findFirst>>>;
    }
  | {
      ok: false;
      code: Exclude<ApiResponseCode, ApiResponseCode.Success>;
      message: string;
    };

export async function findValidInvite(token: string): Promise<InviteLookup> {
  const tokenHash = await hashToken(token);
  const link = await db.query.inviteLinks.findFirst({
    where: (l, { eq }) => eq(l.tokenHash, tokenHash),
  });

  if (!link) {
    return {
      ok: false as const,
      code: ApiResponseCode.NotFound,
      message: "This invite link is no longer valid.",
    };
  }
  if (link.usedAt !== null) {
    return {
      ok: false as const,
      code: ApiResponseCode.InvalidRequest,
      message: "This invite link has already been used.",
    };
  }
  if (now().isAfter(link.expiresAt)) {
    return {
      ok: false as const,
      code: ApiResponseCode.InvalidRequest,
      message: "This invite link has expired.",
    };
  }

  const room = await db.query.rooms.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, link.roomId), isRoomActiveCondition()),
  });
  if (!room) {
    return {
      ok: false as const,
      code: ApiResponseCode.NotFound,
      message: "This invite link is no longer valid.",
    };
  }

  return { ok: true as const, link, room };
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInviteLink(membershipId: string, roomId: string) {
  const config = useRuntimeConfig();
  const token = randomBase62(INVITE_TOKEN_LENGTH);
  const tokenHash = await hashToken(token);
  const expiresAt = now().add(INVITE_TTL_MS, "millisecond");

  await db.insert(schema.inviteLinks).values({
    tokenHash,
    roomId,
    createdByMembershipId: membershipId,
    expiresAt: expiresAt.toDate(),
  });

  return {
    joinUrl: `${config.public.siteUrl}/join/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}
