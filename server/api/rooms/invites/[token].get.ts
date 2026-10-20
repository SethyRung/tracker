import { asc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { user } from "#auth/schema";

function displayName(nickname: string | null, userName: string | null) {
  return nickname?.trim() || userName?.trim() || "Member";
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const token = getRouterParam(event, "token")?.trim() ?? "";
  if (!token || token.length > 64) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Paste your invite code or link.",
    });
  }

  const found = await findValidInvite(token);
  if (!found.ok) {
    return createResponse({ code: found.code, message: found.message });
  }

  const { link, room } = found;
  const rows = await db
    .select({
      id: schema.roomMemberships.id,
      userId: schema.roomMemberships.userId,
      role: schema.roomMemberships.role,
      nickname: schema.roomMemberships.nickname,
      isActive: schema.roomMemberships.isActive,
      userName: user.name,
    })
    .from(schema.roomMemberships)
    .leftJoin(user, eq(user.id, schema.roomMemberships.userId))
    .where(eq(schema.roomMemberships.roomId, room.id))
    .orderBy(asc(schema.roomMemberships.joinedAt));

  const active = rows.filter((row) => row.isActive);
  const existing = active.find((row) => row.userId === session.user.id);
  const inviter = rows.find((row) => row.id === link.createdByMembershipId);

  return createResponse(
    { code: ApiResponseCode.Success },
    {
      room: {
        id: room.id,
        name: room.name,
        usdEnabled: room.usdEnabled,
        khrEnabled: room.khrEnabled,
      },
      inviterName: inviter ? displayName(inviter.nickname, inviter.userName) : null,
      members: active.map((row) => ({ name: displayName(row.nickname, row.userName) })),
      role: existing?.role ?? "member",
      alreadyMember: Boolean(existing),
    },
  );
});
