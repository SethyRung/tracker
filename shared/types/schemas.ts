import { z } from "zod";
import { CURRENCIES } from "./money";
import { BPS_TOTAL } from "./weight";

export const currencySchema = z.enum(CURRENCIES);

export const moneySchema = z.object({
  amount_minor: z.number().int().nonnegative(),
  currency: currencySchema,
});

export const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM");

export const weightEntrySchema = z.object({
  membership_id: z.string().min(1),
  weight_bps: z.number().min(0).max(BPS_TOTAL),
});

export const attendanceSchema = z
  .array(weightEntrySchema)
  .min(1, "At least one attendee is required")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((sum, e) => sum + e.weight_bps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Weights sum to ${total.toFixed(4)}, expected ${BPS_TOTAL.toFixed(4)}`,
        params: { code: "sum_mismatch", total, expected: BPS_TOTAL },
      });
    }
    const ids = new Set<string>();
    for (const [i, e] of entries.entries()) {
      if (ids.has(e.membership_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate attendee ${e.membership_id}`,
          path: [i, "membership_id"],
        });
      }
      ids.add(e.membership_id);
    }
  });

export const sharePercentSchema = z.number().min(0).max(1);

export const nowIsoSchema = z
  .string()
  .datetime({ offset: true })
  .default(() => new Date().toISOString());
