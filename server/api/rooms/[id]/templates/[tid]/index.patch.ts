import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { recurringTemplates, roomMemberships } from "hub:db:schema";
import { z } from "zod";
import { BPS_TOTAL } from "~~/shared/types/weight";

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

const updateTemplateSchema = z
  .object({
    currency: z.enum(["USD", "KHR"]).optional(),
    amountMinor: z.number().int().nonnegative().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1).nullish(),
    memberSnapshot: memberSnapshotSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No updates provided" });

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const tid = getRouterParam(event, "tid");
  if (!roomId || !tid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, updateTemplateSchema.parse);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.amountMinor !== undefined) updates.amountMinor = body.amountMinor;
  if (body.dayOfMonth !== undefined) updates.dayOfMonth = body.dayOfMonth;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.paidByMembershipId !== undefined) {
    if (body.paidByMembershipId) {
      const payer = await db
        .select({ id: roomMemberships.id })
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.id, body.paidByMembershipId),
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.isActive, true),
          ),
        )
        .limit(1);
      if (payer.length === 0) {
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
    .update(recurringTemplates)
    .set(updates)
    .where(and(eq(recurringTemplates.id, tid), eq(recurringTemplates.roomId, roomId)));

  const updated = await db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.id, tid))
    .limit(1);
  const template = updated[0];

  // Activating a template mid-month should post this month's entry right
  // away, same as creating one. Idempotent: a no-op when the entry exists.
  if (template?.isActive) {
    try {
      await materializeRecurringDrafts({ roomId, monthKey: monthKey() });
    } catch (e) {
      console.error("[templates.patch] immediate materialization failed", e);
    }
  }

  return createResponse({ code: ApiResponseCode.Success }, { template });
});
