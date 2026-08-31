import { db, schema } from "@nuxthub/db";

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
