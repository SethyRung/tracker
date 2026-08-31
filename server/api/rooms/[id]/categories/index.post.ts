import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const memberSnapshotSchema = z
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
          code: "custom",
          message: `Duplicate attendee ${e.membershipId}`,
          path: [i, "membershipId"],
        });
      }
      ids.add(e.membershipId);
    }
  });

const templateFields = z.object({
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  isActive: z.boolean().default(true),
  paidByMembershipId: z.string().min(1).nullish(),
  memberSnapshot: memberSnapshotSchema,
});

const createCategorySchema = z
  .object({
    name: z
      .string()
      .max(40)
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, { message: "Name is required" }),
    recurringType: z.enum(["unlimited", "once", "recurring"]).default("unlimited"),
    currency: z.enum(["USD", "KHR"]).optional(),
    amountMinor: z.number().int().nonnegative().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1).nullish(),
    memberSnapshot: memberSnapshotSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recurringType !== "recurring") return;
    const parsed = templateFields.safeParse(data);
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  });

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, createCategorySchema.parse);

  const existing = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.roomId, roomId),
        sql`lower(trim(${schema.categories.name})) = ${body.name.toLowerCase()}`,
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "A category with this name already exists in this room.",
    });
  }

  const rows = await db
    .select({ nextSortOrder: sql<number>`coalesce(max(${schema.categories.sortOrder}), -1) + 1` })
    .from(schema.categories)
    .where(eq(schema.categories.roomId, roomId));

  const template = body.recurringType === "recurring" ? templateFields.parse(body) : null;

  if (template?.paidByMembershipId) {
    const payer = await findActiveRoomMember(roomId, template.paidByMembershipId);
    if (!payer) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Payer must be an active member of this room.",
      });
    }
  }

  const id = newId();
  const inserted = await db
    .insert(schema.categories)
    .values({
      id,
      roomId,
      name: body.name,
      sortOrder: rows[0]?.nextSortOrder ?? 0,
      recurringType: body.recurringType,
    })
    .returning();
  const category = inserted[0];
  if (!category) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to create category",
    });
  }

  if (template) {
    try {
      await db.insert(schema.recurringTemplates).values({
        id: newId(),
        roomId,
        categoryId: category.id,
        currency: template.currency,
        amountMinor: template.amountMinor,
        dayOfMonth: template.dayOfMonth,
        isActive: template.isActive,
        paidByMembershipId: template.paidByMembershipId ?? null,
        memberSnapshot: template.memberSnapshot,
      });
    } catch (e) {
      await db.delete(schema.categories).where(eq(schema.categories.id, category.id));
      throw e;
    }

    if (template.isActive) {
      try {
        await materializeRecurringDrafts({ roomId, monthKey: monthKey() });
      } catch (e) {
        console.error("[categories.post] immediate materialization failed", e);
      }
    }
  }

  return createResponse({ code: ApiResponseCode.Success }, category);
});
