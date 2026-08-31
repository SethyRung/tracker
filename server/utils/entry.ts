import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export async function findRoomEntry(roomId: string, entryId: string) {
  return db.query.entries.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, entryId), eq(e.roomId, roomId)),
  });
}

export async function findEntryWeights(entryId: string) {
  return db.query.entryWeights.findMany({
    where: (w, { eq }) => eq(w.entryId, entryId),
  });
}

export function canMutateEntry(
  entry: { status: "draft" | "published"; createdByUserId: string },
  ctx: { role: string; userId: string },
): boolean {
  if (ctx.role === "admin") return true;
  if (entry.status === "published") return entry.createdByUserId === ctx.userId;
  return false;
}

export function entryMutationForbiddenMessage(
  status: "draft" | "published",
  action: "edit" | "delete",
): string {
  return status === "draft"
    ? `Only an admin can ${action} a draft entry.`
    : `Only the creator or an admin can ${action} this entry.`;
}

export async function areActiveAttendees(
  roomId: string,
  membershipIds: readonly string[],
): Promise<boolean> {
  const attendeeIds = new Set(membershipIds);
  if (attendeeIds.size === 0) return true;
  const active = await db.query.roomMemberships.findMany({
    columns: { id: true },
    where: (m, { eq, and, inArray }) =>
      and(eq(m.roomId, roomId), eq(m.isActive, true), inArray(m.id, [...attendeeIds])),
  });
  return active.length === attendeeIds.size;
}

export async function replaceEntryWeights(
  entryId: string,
  weights: Array<{ membershipId: string; weightBps: number }>,
) {
  await db.delete(schema.entryWeights).where(eq(schema.entryWeights.entryId, entryId));
  if (weights.length === 0) return;
  await db.insert(schema.entryWeights).values(
    weights.map((w) => ({
      entryId,
      membershipId: w.membershipId,
      weightBps: w.weightBps,
    })),
  );
}
