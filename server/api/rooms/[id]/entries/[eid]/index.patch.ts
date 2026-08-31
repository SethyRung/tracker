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

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getEntryId(event);

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateEntrySchema.parse);

  const entry = await findRoomEntry(roomId, eid);
  if (!entry) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }
  if (!canMutateEntry(entry, ctx)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: entryMutationForbiddenMessage(entry.status, "edit"),
    });
  }

  const closed = await closedMonthResponse(roomId, monthKey(entry.date));
  if (closed) return closed;
  if (body.date) {
    const nextClosed = await closedMonthResponse(roomId, monthKey(body.date));
    if (nextClosed) return nextClosed;
  }

  if (
    body.weights &&
    !(await areActiveAttendees(
      roomId,
      body.weights.map((w) => w.membershipId),
    ))
  ) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "One or more attendees are not active members of this room.",
    });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.date !== undefined) updates.date = body.date;
  if (body.paidByMembershipId !== undefined) updates.paidByMembershipId = body.paidByMembershipId;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  if (Object.keys(updates).length > 1) {
    await db.update(schema.entries).set(updates).where(eq(schema.entries.id, eid));
  }
  if (body.weights) {
    await replaceEntryWeights(eid, body.weights);
  }

  const updated = await findRoomEntry(roomId, eid);
  const weights = await findEntryWeights(eid);
  return createResponse({ code: ApiResponseCode.Success }, { ...updated!, weights });
});
