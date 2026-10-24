import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const memberSnapshotEntrySchema = z.object(
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

const memberSnapshotSchema = z
  .array(memberSnapshotEntrySchema, "Pick at least one roommate")
  .min(1, "Pick at least one roommate")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((s, e) => s + e.weightBps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shares must total 100%",
        params: { code: "sum_mismatch", total, expected: BPS_TOTAL },
      });
    }
    const ids = new Set<string>();
    for (const [i, e] of entries.entries()) {
      if (ids.has(e.membershipId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each roommate can only be included once",
          path: [i, "membershipId"],
        });
      }
      ids.add(e.membershipId);
    }
  });

const bodySchema = z
  .object({
    currency: z.enum(["USD", "KHR"], "Choose USD or KHR").optional(),
    amountMinor: z
      .number("Enter a valid amount")
      .int("Enter a valid amount")
      .nonnegative("Amount cannot be negative")
      .optional(),
    dayOfMonth: z
      .number("Pick a day of the month")
      .int("Choose a whole-number day")
      .min(1, "Choose a day from 1 to 31")
      .max(31, "Choose a day from 1 to 31")
      .optional(),
    isActive: z.boolean("Choose whether this recurring bill is active").optional(),
    paidByMembershipId: z.string("Pick who pays").min(1, "Pick who pays").nullish(),
    memberSnapshot: memberSnapshotSchema.optional(),
    syncCurrentEntry: z.boolean("Choose whether to update this month’s bill").optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No updates provided" });

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const tid = getTemplateId(event);

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, bodySchema.parse);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.dayOfMonth !== undefined) updates.dayOfMonth = body.dayOfMonth;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.paidByMembershipId !== undefined) {
    if (body.paidByMembershipId) {
      const payer = await findActiveRoomMember(roomId, body.paidByMembershipId);
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
    const closed = await closedMonthResponse(roomId, monthKey());
    if (closed) return closed;
    const current = await findCurrentMonthEntryForTemplate(roomId, template.id);
    if (current) {
      await syncEntryToTemplate(current.id, template);
    }
  }

  return createResponse({ code: ApiResponseCode.Success }, template);
});
