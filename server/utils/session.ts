import { db } from "hub:db";
import { roomMemberships, rooms } from "hub:db:schema";
import { and, eq, asc } from "drizzle-orm";

/**
 * Augment a Better Auth session payload with the user's active `roomId`.
 *
 * Resolves the user's active room fresh on every call so that a recently
 * joined/left room is reflected immediately, regardless of session cookie
 * cache TTL.
 */
export async function attachActiveRoom<T extends { user: { id: string } }>(
  sessionData: T,
): Promise<T & { user: T["user"] & { roomId: string | null } }> {
  const rows = await db
    .select({ id: rooms.id })
    .from(roomMemberships)
    .innerJoin(rooms, eq(rooms.id, roomMemberships.roomId))
    .where(and(eq(roomMemberships.userId, sessionData.user.id), eq(roomMemberships.isActive, true)))
    .orderBy(asc(roomMemberships.joinedAt))
    .limit(1);

  return {
    ...sessionData,
    user: { ...sessionData.user, roomId: rows[0]?.id ?? null },
  };
}
