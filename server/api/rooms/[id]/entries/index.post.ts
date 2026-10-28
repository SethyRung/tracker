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

const createEntrySchema = z.object({
  categoryId: z.string("Pick a valid category").nullable().optional(),
  currency: z.enum(["USD", "KHR"], "Choose USD or KHR"),
  amountMinor: z
    .number("Enter a valid amount")
    .int("Enter a valid amount")
    .nonnegative("Amount cannot be negative"),
  date: z.coerce.date("Enter a valid date"),
  paidByMembershipId: z.string("Pick who pays").min(1, "Pick who pays"),
  notes: z
    .string("Enter a description")
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional(),
  weights: weightsSchema,
  templateId: z.string("Choose a valid recurring bill").nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, createEntrySchema.parse);

  const closed = await closedMonthResponse(roomId, monthKey(body.date));
  if (closed) return closed;

  const status = "published" as const;
  const templateId = body.templateId ?? null;

  if (
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

  if (body.categoryId) {
    const categoryId = body.categoryId;
    const cat = await db.query.categories.findFirst({
      columns: { recurringType: true },
      where: (c, { eq, and }) => and(eq(c.id, categoryId), eq(c.roomId, roomId)),
    });
    if (!cat) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Category not found in this room.",
      });
    }
    if (cat.recurringType === "recurring") {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Recurring bills are managed through category templates.",
      });
    }
    if (cat.recurringType === "once") {
      const { start, end } = monthRange(monthKey(body.date));
      const existing = await db.query.entries.findFirst({
        columns: { id: true },
        where: (e, { eq, and, gte, lt }) =>
          and(
            eq(e.roomId, roomId),
            eq(e.categoryId, categoryId),
            gte(e.date, start.toDate()),
            lt(e.date, end.toDate()),
          ),
      });
      if (existing) {
        return createResponse({
          code: ApiResponseCode.InvalidRequest,
          message:
            "This category allows only one entry per month. Edit the existing entry instead.",
        });
      }
    }
  }

  const id = newId();
  await db.insert(schema.entries).values({
    id,
    roomId,
    categoryId: body.categoryId ?? null,
    currency: body.currency,
    amountMinor: body.amountMinor,
    date: body.date,
    paidByMembershipId: body.paidByMembershipId,
    notes: body.notes ?? null,
    status,
    templateId,
    createdByUserId: ctx.userId,
  });
  if (body.weights.length > 0) {
    await db.insert(schema.entryWeights).values(
      body.weights.map((w) => ({
        entryId: id,
        membershipId: w.membershipId,
        weightBps: w.weightBps,
      })),
    );
  }

  const created = await findRoomEntry(roomId, id);
  const weights = await findEntryWeights(id);
  return createResponse({ code: ApiResponseCode.Success }, { ...created!, weights });
});
