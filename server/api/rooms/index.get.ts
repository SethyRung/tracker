import { db } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const memberships = await db.query.roomMemberships.findMany({
    where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.isActive, true)),
    orderBy: (m) => m.joinedAt,
  });

  const roomIds = memberships.map((m) => m.roomId);
  if (roomIds.length === 0) {
    return createResponse({ code: ApiResponseCode.Success }, []);
  }

  const [rooms, allMembers] = await Promise.all([
    db.query.rooms.findMany({
      where: (r, { inArray }) => inArray(r.id, roomIds),
    }),
    db.query.roomMemberships.findMany({
      where: (m, { and, inArray, eq }) =>
        and(inArray(m.roomId, roomIds), eq(m.isActive, true)),
    }),
  ]);

  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const countByRoom = new Map<string, number>();
  for (const m of allMembers) {
    countByRoom.set(m.roomId, (countByRoom.get(m.roomId) ?? 0) + 1);
  }

  const result = memberships.flatMap((m) => {
    const room = roomById.get(m.roomId);
    if (!room) return [];
    return [
      {
        id: room.id,
        name: room.name,
        usdEnabled: room.usdEnabled,
        khrEnabled: room.khrEnabled,
        role: m.role,
        memberCount: countByRoom.get(m.roomId) ?? 0,
      },
    ];
  });

  return createResponse({ code: ApiResponseCode.Success }, result);
});