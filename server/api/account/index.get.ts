import { db } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const memberships = await db.query.roomMemberships.findMany({
    where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.isActive, true)),
    orderBy: (m) => m.joinedAt,
  });

  const roomIds = memberships.map((m) => m.roomId);
  const rooms =
    roomIds.length === 0
      ? []
      : await db.query.rooms.findMany({
          where: (r, { and, inArray }) => and(inArray(r.id, roomIds), isRoomActiveCondition()),
        });
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  const roomProfiles = memberships.flatMap((m) => {
    const room = roomById.get(m.roomId);
    if (!room) return [];
    return [
      {
        id: m.id,
        roomId: room.id,
        roomName: room.name,
        displayName: m.displayName,
        nickname: m.nickname,
        avatarUrl: m.avatarUrl,
        color: m.color,
      },
    ];
  });

  return createResponse(
    { code: ApiResponseCode.Success },
    {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      memberships: roomProfiles,
    },
  );
});
