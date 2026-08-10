import { z } from "zod";
import { BPS_TOTAL } from "../types/weight";

const weightEntrySchema = z.object({
  membershipId: z.string().min(1),
  weightBps: z.number().min(0).max(BPS_TOTAL),
});

const weightsSchema = z
  .array(weightEntrySchema)
  .min(1, "At least one attendee is required")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((sum, e) => sum + e.weightBps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Weights sum to ${total.toFixed(4)}, expected ${BPS_TOTAL.toFixed(4)}`,
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

export const createBillSchema = z.object({
  categoryId: z.string().nullable().optional(),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  date: z.coerce.date(),
  paidByMembershipId: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema,
});

export const updateBillSchema = z.object({
  categoryId: z.string().nullable().optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  date: z.coerce.date().optional(),
  paidByMembershipId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema.optional(),
});

export const billListQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  categoryId: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type BillListQuery = z.infer<typeof billListQuerySchema>;
