import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const weightEntrySchema = z.object({
  membershipId: z.string().min(1),
  weightBps: z.number().int().min(0).max(BPS_TOTAL),
});

const weightsSchema = z
  .array(weightEntrySchema)
  .min(1, "At least one attendee is required")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((sum, e) => sum + e.weightBps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: "custom",
        message: `Weights sum to ${total.toFixed(4)}, expected ${BPS_TOTAL.toFixed(4)}`,
        params: { code: "sum_mismatch", total, expected: BPS_TOTAL },
      });
    }
    const ids = new Set<string>();
    for (const [i, e] of entries.entries()) {
      if (ids.has(e.membershipId)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate attendee ${e.membershipId}`,
          path: [i, "membershipId"],
        });
      }
      ids.add(e.membershipId);
    }
  });

const updateEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  date: z.coerce.date().optional(),
  paidByMembershipId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema.optional(),
});

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

function canMutate(entry: EntryShape, isAdmin: boolean, isOwner: boolean) {
  if (isAdmin) return true;
  if (entry.status === "published") return isOwner;
  return false;
}

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getRouterParam(event, "eid");
  if (!eid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateEntrySchema.parse);

  const entry = await db.query.entries.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, eid), eq(e.roomId, roomId)),
  });
  if (!entry) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }
  if (entry.templateId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Recurring entries are edited from the category.",
    });
  }

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

  try {
    await assertMonthOpen(roomId, monthKeyFromDate(entry.date));
    if (body.date) await assertMonthOpen(roomId, monthKeyFromDate(body.date));
  } catch (e) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: e instanceof Error ? e.message : "Month is closed.",
    });
  }

  if (body.weights && body.weights.length > 0) {
    const attendeeIds = new Set(body.weights.map((w) => w.membershipId));
    const active = await db.query.roomMemberships.findMany({
      columns: { id: true },
      where: (m, { eq, and, inArray }) =>
        and(eq(m.roomId, roomId), eq(m.isActive, true), inArray(m.id, [...attendeeIds])),
    });
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
      await tx.update(schema.entries).set(updates).where(eq(schema.entries.id, eid));
    }
    if (body.weights) {
      await tx.delete(schema.entryWeights).where(eq(schema.entryWeights.entryId, eid));
      if (body.weights.length > 0) {
        await tx.insert(schema.entryWeights).values(
          body.weights.map((w) => ({
            entryId: eid,
            membershipId: w.membershipId,
            weightBps: w.weightBps,
          })),
        );
      }
    }
  });

  const updated = await db.query.entries.findFirst({
    where: (e, { eq }) => eq(e.id, eid),
  });
  const weights = await db.query.entryWeights.findMany({
    where: (w, { eq }) => eq(w.entryId, eid),
  });
  const result = { ...updated!, weights } as EntryWithWeights;
  return createResponse({ code: ApiResponseCode.Success }, result);
});
