import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .max(40)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "Name is required" }),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .max(40)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "Name is required" })
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// Per Phase 4 open question: case-insensitive uniqueness within a room.
// "Food" and "food" collide.
export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}
