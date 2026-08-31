import type { H3Event } from "h3";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export function newId(): string {
  return crypto.randomUUID();
}

export function isRoomActiveCondition() {
  return isNull(schema.rooms.deletedAt);
}

export async function requireRoomContext(event: H3Event, roomId: string) {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const rooms = await db
    .select()
    .from(schema.rooms)
    .where(and(eq(schema.rooms.id, roomId), isRoomActiveCondition()))
    .limit(1);
  const room = rooms[0];

  if (!room) {
    throw createError({ statusCode: 404, statusMessage: "Room not found" });
  }

  const memberships = await db
    .select()
    .from(schema.roomMemberships)
    .where(
      and(
        eq(schema.roomMemberships.roomId, roomId),
        eq(schema.roomMemberships.userId, userId),
        eq(schema.roomMemberships.isActive, true),
      ),
    )
    .limit(1);
  const membership = memberships[0];

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: "Not a member of this room" });
  }

  return {
    room,
    membership,
    role: membership.role,
    userId,
  };
}

export async function findActiveRoomMember(roomId: string, membershipId: string) {
  return db.query.roomMemberships.findFirst({
    columns: { id: true },
    where: (m, { eq, and }) =>
      and(eq(m.id, membershipId), eq(m.roomId, roomId), eq(m.isActive, true)),
  });
}

export async function requireRoomAdmin(event: H3Event, roomId: string) {
  const ctx = await requireRoomContext(event, roomId);
  if (ctx.role !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Admin access required" });
  }
  return ctx;
}

export async function promoteAdminOnDeparture(roomId: string) {
  const remaining = await db
    .select({
      id: schema.roomMemberships.id,
      joinedAt: schema.roomMemberships.joinedAt,
    })
    .from(schema.roomMemberships)
    .where(
      and(
        eq(schema.roomMemberships.roomId, roomId),
        eq(schema.roomMemberships.role, "member"),
        eq(schema.roomMemberships.isActive, true),
      ),
    );
  const next = pickNextAdmin(remaining);
  if (!next) {
    throw createError({
      statusCode: 403,
      statusMessage: "Sorry, no more members to promote to admin",
    });
  }

  await db
    .update(schema.roomMemberships)
    .set({ role: "admin" })
    .where(eq(schema.roomMemberships.id, next.id));

  return next.id;
}
