import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const weightEntrySchema = z.object(
  {
    membershipId: z.string("Pick a roommate").min(1, "Pick a roommate"),
    weightBps: z
      .number("Enter a valid share percentage")
      .int("Use at most two decimal places for shares")
      .min(0, "Shares cannot be negative")
      .max(BPS_TOTAL, "A share cannot exceed 100%"),
  },
  "Pick a valid roommate",
);

const weightsSchema = z
  .array(weightEntrySchema, "Pick at least one roommate")
  .min(1, "Pick at least one roommate")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((sum, e) => sum + e.weightBps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: "custom",
        message: "Shares must total 100%",
        params: { code: "sum_mismatch", total, expected: BPS_TOTAL },
      });
    }
    const ids = new Set<string>();
    for (const [i, e] of entries.entries()) {
      if (ids.has(e.membershipId)) {
        ctx.addIssue({
          code: "custom",
          message: "Each roommate can only be included once",
          path: [i, "membershipId"],
        });
      }
      ids.add(e.membershipId);
    }
  });

const updateEntrySchema = z.object({
  categoryId: z.string("Pick a valid category").nullable().optional(),
  amountMinor: z
    .number("Enter a valid amount")
    .int("Enter a valid amount")
    .nonnegative("Amount cannot be negative")
    .optional(),
  date: z.coerce.date("Enter a valid date").optional(),
  paidByMembershipId: z.string("Pick who pays").min(1, "Pick who pays").optional(),
  notes: z
    .string("Enter a description")
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
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

  const categoryId = body.categoryId === undefined ? entry.categoryId : body.categoryId;
  if (categoryId) {
    const category = await db.query.categories.findFirst({
      columns: { recurringType: true },
      where: (c, { eq, and }) => and(eq(c.id, categoryId), eq(c.roomId, roomId)),
    });
    if (!category) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Category not found in this room.",
      });
    }
    if (category.recurringType === "recurring" && categoryId !== entry.categoryId) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Recurring bills are managed through category templates.",
      });
    }
    if (category.recurringType === "once") {
      const { start, end } = monthRange(monthKey(body.date ?? entry.date));
      const existing = await db.query.entries.findFirst({
        columns: { id: true },
        where: (e, { eq, ne, and, gte, lt }) =>
          and(
            eq(e.roomId, roomId),
            eq(e.categoryId, categoryId),
            ne(e.id, eid),
            gte(e.date, start.toDate()),
            lt(e.date, end.toDate()),
          ),
      });
      if (existing) {
        return createResponse({
          code: ApiResponseCode.InvalidRequest,
          message: "This category allows only one entry per month. Edit the existing entry instead.",
        });
      }
    }
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
