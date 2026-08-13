import { z } from "zod";
import { weightsSchema } from "./weight";

export const entryStatusSchema = z.enum(["draft", "published"]);

export const createEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  date: z.coerce.date(),
  paidByMembershipId: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema,

  templateId: z.string().nullable().optional(),
});

export const updateEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  date: z.coerce.date().optional(),
  paidByMembershipId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema.optional(),
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
