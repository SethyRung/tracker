import { db } from "hub:db";
import { inviteLinks } from "hub:db:schema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInviteLink(userId: string, roomId: string) {
  const config = useRuntimeConfig();
  const token = randomBase62(INVITE_TOKEN_LENGTH);
  const tokenHash = await hashToken(token);
  const expiresAt = now().add(INVITE_TTL_MS, "millisecond");

  await db.insert(inviteLinks).values({
    tokenHash,
    roomId,
    createdByMembershipId: userId,
    expiresAt: expiresAt.toDate(),
  });

  return {
    joinUrl: `${config.public.siteUrl}/join/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}
