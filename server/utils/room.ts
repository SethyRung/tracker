import type { H3Event } from "h3";
import { and, eq, asc } from "drizzle-orm";
import { db } from "hub:db";
import { rooms, roomMemberships } from "hub:db:schema";

type Room = typeof rooms.$inferSelect;
type RoomMembership = typeof roomMemberships.$inferSelect;

export type RoomRole = "admin" | "member";

export interface RoomContext {
  room: Room;
  membership: RoomMembership;
  role: RoomRole;
  userId: string;
}

export async function requireRoomContext(event: H3Event, roomId: string): Promise<RoomContext> {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (room.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Room not found" });
  }

  const membership = await db
    .select()
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        eq(roomMemberships.userId, userId),
        eq(roomMemberships.isActive, true),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    throw createError({ statusCode: 403, statusMessage: "Not a member of this room" });
  }

  return {
    room: room[0]!,
    membership: membership[0]!,
    role: membership[0]!.role as RoomRole,
    userId,
  };
}

export async function requireRoomAdmin(event: H3Event, roomId: string): Promise<RoomContext> {
  const ctx = await requireRoomContext(event, roomId);
  if (ctx.role !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Admin access required" });
  }
  return ctx;
}

export async function getActiveRoomForUser(userId: string): Promise<Room | null> {
  const membership = await db
    .select({ room: rooms })
    .from(roomMemberships)
    .innerJoin(rooms, eq(rooms.id, roomMemberships.roomId))
    .where(and(eq(roomMemberships.userId, userId), eq(roomMemberships.isActive, true)))
    .orderBy(asc(roomMemberships.joinedAt))
    .limit(1);

  return membership[0]?.room ?? null;
}

export async function promoteAdminOnDeparture(roomId: string): Promise<string | null> {
  const remaining = await db
    .select()
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        eq(roomMemberships.role, "member"),
        eq(roomMemberships.isActive, true),
      ),
    )
    .orderBy(asc(roomMemberships.joinedAt));

  const next = remaining[0];
  if (!next) return null;

  await db.update(roomMemberships).set({ role: "admin" }).where(eq(roomMemberships.id, next.id));

  return next.id;
}

export function newId(): string {
  return crypto.randomUUID();
}
