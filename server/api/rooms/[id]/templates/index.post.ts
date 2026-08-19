import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.object({
  categoryId: z.string().min(1),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  isActive: z.boolean().default(true),
  paidByMembershipId: z.string().min(1).nullish(),
  memberSnapshot: z
    .array(
      z.object({
        membershipId: z.string().min(1),
        weightBps: z.number().int().min(0).max(BPS_TOTAL),
      }),
    )
    .min(1, "At least one attendee is required")
    .superRefine((entries, ctx) => {
      const total = entries.reduce((s, e) => s + e.weightBps, 0);
      if (Math.abs(total - BPS_TOTAL) > 0.0001) {
        ctx.addIssue({
          code: "custom",
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
    }),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, bodySchema.parse);

  const cat = await db.query.categories.findFirst({
    columns: { id: true, recurringType: true },
    where: (c, { eq, and }) => and(eq(c.id, body.categoryId), eq(c.roomId, roomId)),
  });

  if (!cat) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Category not found in this room.",
    });
  }
  if (cat.recurringType !== "recurring") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Templates can only be created for recurring categories.",
    });
  }

  const existing = await db.query.recurringTemplates.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.categoryId, body.categoryId),
  });
  if (existing) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This category already has a recurring template. Edit the existing one.",
    });
  }

  if (body.paidByMembershipId) {
    const paidBy = body.paidByMembershipId;
    const payer = await db.query.roomMemberships.findFirst({
      columns: { id: true },
      where: (m, { eq, and }) => and(eq(m.id, paidBy), eq(m.roomId, roomId), eq(m.isActive, true)),
    });
    if (!payer) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Payer must be an active member of this room.",
      });
    }
  }

  const id = newId();
  await db.insert(schema.recurringTemplates).values({
    id,
    roomId,
    categoryId: body.categoryId,
    currency: body.currency,
    amountMinor: body.amountMinor,
    dayOfMonth: body.dayOfMonth,
    isActive: body.isActive,
    paidByMembershipId: body.paidByMembershipId ?? null,
    memberSnapshot: body.memberSnapshot,
  });

  if (body.isActive) {
    try {
      await materializeRecurringDrafts({ roomId, monthKey: monthKey() });
    } catch (e) {
      console.error("[templates.post] immediate materialization failed", e);
    }
  }

  const template = await db.query.recurringTemplates.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!template) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to create template",
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, template);
});
