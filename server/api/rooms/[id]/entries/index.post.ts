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

const createEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  date: z.coerce.date(),
  paidByMembershipId: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema,
  templateId: z.string().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, createEntrySchema.parse);

  try {
    await assertMonthOpenForDate(roomId, body.date);
  } catch (e) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: e instanceof Error ? e.message : "Month is closed.",
    });
  }

  const status = "published" as const;
  const templateId = body.templateId ?? null;

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

  if (body.categoryId) {
    const categoryId = body.categoryId;
    const cat = await db.query.categories.findFirst({
      columns: { recurringType: true },
      where: (c, { eq, and }) => and(eq(c.id, categoryId), eq(c.roomId, roomId)),
    });
    if (cat?.recurringType === "once") {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: PHNOM_PENH_TZ,
        year: "numeric",
        month: "2-digit",
      }).formatToParts(body.date);
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      if (y && m) {
        const { start, end } = monthRange(`${y}-${m}`);
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

  const created = await db.query.entries.findFirst({
    where: (e, { eq }) => eq(e.id, id),
  });
  const weights = await db.query.entryWeights.findMany({
    where: (w, { eq }) => eq(w.entryId, id),
  });
  const entry = { ...created!, weights };
  return createResponse({ code: ApiResponseCode.Success }, entry);
});
