import { z } from "zod";
import { weightsSchema } from "./weight";

// Household expenses live in one `entries` table (SPEC §8). There is no
// bill/payment `type`: user entries are created `published`; `draft` entries
// are only materialized by recurring templates (Phase 7). Edit/delete rule:
// published → creator or admin; draft → admin only. Publish is admin-only.
export const entryStatusSchema = z.enum(["draft", "published"]);

export const createEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  date: z.coerce.date(),
  paidByMembershipId: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema,
  // Only set by the Phase 7 materialization task; user creates send none.
  templateId: z.string().nullable().optional(),
});

export const updateEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  date: z.coerce.date().optional(),
  paidByMembershipId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema.optional(),
  // `status` moves only via the dedicated publish endpoint, not via PATCH.
});

export const entryListQuerySchema = z.object({
  status: entryStatusSchema.optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  categoryId: z.string().optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type EntryListQuery = z.infer<typeof entryListQuerySchema>;