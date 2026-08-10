import { db } from "hub:db";
import { inviteLinks } from "hub:db:schema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  const ctx = await requireRoomAdmin(event, roomId);

  const token = randomBase62(INVITE_TOKEN_LENGTH);
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await db.insert(inviteLinks).values({
    tokenHash,
    roomId,
    createdByMembershipId: ctx.membership.id,
    expiresAt,
  });

  return createResponse({ code: ApiResponseCode.Success }, { token, expiresAt });
});
