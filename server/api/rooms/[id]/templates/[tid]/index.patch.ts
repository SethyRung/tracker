import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const memberSnapshotEntrySchema = z.object({
  membershipId: z.string().min(1),
  weightBps: z.number().int().min(0).max(BPS_TOTAL),
});

const memberSnapshotSchema = z
  .array(memberSnapshotEntrySchema)
  .min(1, "At least one attendee is required")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((s, e) => s + e.weightBps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Snapshot weights sum to ${total.toFixed(4)}, expected ${BPS_TOTAL.toFixed(4)}.`,
        params: { code: "sum_mismatch", total, expected: BPS_TOTAL },
      });
    }
    const ids = new Set<string>();
    for (const [i, e] of entries.entries()) {
      if (ids.has(e.membershipId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate attendee ${e.membershipId}`,
          path: [i, "membershipId"],
        });
      }
      ids.add(e.membershipId);
    }
  });

const bodySchema = z
  .object({
    currency: z.enum(["USD", "KHR"]).optional(),
    amountMinor: z.number().int().nonnegative().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1).nullish(),
    memberSnapshot: memberSnapshotSchema.optional(),
    syncCurrentEntry: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No updates provided" });

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const tid = getRouterParam(event, "tid");
  if (!tid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, bodySchema.parse);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.dayOfMonth !== undefined) updates.dayOfMonth = body.dayOfMonth;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.paidByMembershipId !== undefined) {
    if (body.paidByMembershipId) {
      const paidBy = body.paidByMembershipId;
      const payer = await db.query.roomMemberships.findFirst({
        columns: { id: true },
        where: (m, { eq, and }) =>
          and(eq(m.id, paidBy), eq(m.roomId, roomId), eq(m.isActive, true)),
      });
      if (!payer) {
        return createResponse({
          code: ApiResponseCode.InvalidRequest,
          message: "Payer must be an active member of this room.",
        });
      }
    }
    updates.paidByMembershipId = body.paidByMembershipId ?? null;
  }
  if (body.memberSnapshot !== undefined) updates.memberSnapshot = body.memberSnapshot;

  await db
    .update(schema.recurringTemplates)
    .set(updates)
    .where(
      and(eq(schema.recurringTemplates.id, tid), eq(schema.recurringTemplates.roomId, roomId)),
    );

  const template = await db.query.recurringTemplates.findFirst({
    where: (t, { eq }) => eq(t.id, tid),
  });
  if (!template) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to update template",
    });
  }

  if (template.isActive) {
    try {
      await materializeRecurringDrafts({ roomId, monthKey: monthKey() });
    } catch (e) {
      console.error("[templates.patch] immediate materialization failed", e);
    }
  }

  if (body.syncCurrentEntry) {
    try {
      await assertMonthOpen(roomId, monthKey());
    } catch (e) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: e instanceof Error ? e.message : "Current month is closed.",
      });
    }
    const current = await findCurrentMonthEntryForTemplate(roomId, template.id);
    if (current) {
      await syncEntryToTemplate(current.id, template);
    }
  }

  return createResponse({ code: ApiResponseCode.Success }, template);
});
