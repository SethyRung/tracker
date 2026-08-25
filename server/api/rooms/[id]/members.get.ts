import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { user } from "#auth/schema";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);

  const rows = await db
    .select({
      membership: schema.roomMemberships,
      accountImage: user.image,
      userName: user.name,
    })
    .from(schema.roomMemberships)
    .leftJoin(user, eq(user.id, schema.roomMemberships.userId))
    .where(
      and(eq(schema.roomMemberships.roomId, roomId), eq(schema.roomMemberships.isActive, true)),
    )
    .orderBy(asc(schema.roomMemberships.joinedAt));

  const members = rows.map(({ membership, accountImage, userName }) => ({
    id: membership.id,
    roomId: membership.roomId,
    userId: membership.userId,
    role: membership.role,
    nickname: membership.nickname,
    userName: (userName ?? "") as string,
    avatarUrl: (membership.avatarUrl ?? accountImage ?? null) as string | null,
    color: membership.color,
    sharePercentBps: membership.sharePercentBps,
    joinedAt: membership.joinedAt,
    leftAt: membership.leftAt,
    isActive: membership.isActive,
  }));

  return createResponse({ code: ApiResponseCode.Success }, members);
});
