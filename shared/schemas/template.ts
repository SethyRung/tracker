import { z } from "zod";
import { BPS_TOTAL } from "../types/weight";

// One RecurringTemplate per category with recurring_type='recurring' (Phase 7).
// Materializes a draft entry on the 1st of each (ICT) month from
// member_snapshot — pruned to current active members.

const memberSnapshotEntrySchema = z.object({
  membershipId: z.string().min(1),
  weightBps: z.number().int().min(0).max(BPS_TOTAL),
});

export const memberSnapshotSchema = z
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

export const createTemplateSchema = z.object({
  categoryId: z.string().min(1),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  isActive: z.boolean().default(true),
  // Who fronts this expense. Omitted/null => materializer falls back to the
  // longest-tenured active member.
  paidByMembershipId: z.string().min(1).nullish(),
  memberSnapshot: memberSnapshotSchema,
});

export const updateTemplateSchema = z
  .object({
    currency: z.enum(["USD", "KHR"]).optional(),
    amountMinor: z.number().int().nonnegative().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1).nullish(),
    memberSnapshot: memberSnapshotSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No updates provided" });

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type MemberSnapshotEntry = z.infer<typeof memberSnapshotEntrySchema>;
