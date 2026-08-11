import { and, eq, inArray } from "drizzle-orm";
import { db } from "hub:db";
import { entries, entryWeights, roomMemberships } from "hub:db:schema";
import { ApiResponseCode, type ApiResponse } from "#shared/types/response";
import { updateEntrySchema } from "~~/shared/schemas/entry";

interface EntryShape {
  id: string;
  roomId: string;
  categoryId: string | null;
  currency: "USD" | "KHR";
  amountMinor: number;
  date: Date;
  paidByMembershipId: string;
  notes: string | null;
  status: "draft" | "published";
  templateId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface EntryWithWeights extends EntryShape {
  weights: { entryId: string; membershipId: string; weightBps: number }[];
}
interface UpdateEntryResponse {
  entry: EntryWithWeights;
}

// Unified edit/delete rule (SPEC §8): published → creator or admin; draft →
// admin only (drafts are recurring-template materializations up for review).
function canMutate(entry: EntryShape, isAdmin: boolean, isOwner: boolean) {
  if (isAdmin) return true;
  if (entry.status === "published") return isOwner;
  return false;
}

export default defineEventHandler(async (event): Promise<ApiResponse<UpdateEntryResponse>> => {
  const roomId = getRouterParam(event, "id");
  const eid = getRouterParam(event, "eid");
  if (!roomId || !eid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateEntrySchema.parse);

  const current = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, eid), eq(entries.roomId, roomId)))
    .limit(1);
  if (current.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }
  const entry = current[0]!;

  const isAdmin = ctx.role === "admin";
  const isOwner = entry.createdByUserId === ctx.userId;
  if (!canMutate(entry, isAdmin, isOwner)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message:
        entry.status === "draft"
          ? "Only an admin can edit a draft entry."
          : "Only the creator or an admin can edit this entry.",
    });
  }

  if (body.weights && body.weights.length > 0) {
    const attendeeIds = new Set(body.weights.map((w) => w.membershipId));
    const active = await db
      .select({ id: roomMemberships.id })
      .from(roomMemberships)
      .where(
        and(
          eq(roomMemberships.roomId, roomId),
          eq(roomMemberships.isActive, true),
          inArray(roomMemberships.id, [...attendeeIds]),
        ),
      );
    if (active.length !== attendeeIds.size) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "One or more attendees are not active members of this room.",
      });
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.date !== undefined) updates.date = body.date;
  if (body.paidByMembershipId !== undefined) updates.paidByMembershipId = body.paidByMembershipId;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  await db.transaction(async (tx) => {
    if (Object.keys(updates).length > 1) {
      await tx.update(entries).set(updates).where(eq(entries.id, eid));
    }
    if (body.weights) {
      await tx.delete(entryWeights).where(eq(entryWeights.entryId, eid));
      if (body.weights.length > 0) {
        await tx.insert(entryWeights).values(
          body.weights.map((w) => ({
            entryId: eid,
            membershipId: w.membershipId,
            weightBps: w.weightBps,
          })),
        );
      }
    }
  });

  const updated = await db.select().from(entries).where(eq(entries.id, eid)).limit(1);
  const weights = await db.select().from(entryWeights).where(eq(entryWeights.entryId, eid));
  const result = { ...updated[0], weights } as EntryWithWeights;
  return createResponse({ code: ApiResponseCode.Success }, { entry: result });
});