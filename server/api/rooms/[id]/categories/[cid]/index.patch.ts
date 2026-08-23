import { and, eq, ne, sql } from "drizzle-orm";
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

const updateCategorySchema = z.object({
  name: z
    .string()
    .max(40)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "Name is required" })
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  recurringType: z.enum(["unlimited", "once", "recurring"]).optional(),
  currency: z.enum(["USD", "KHR"]).optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
  paidByMembershipId: z.string().min(1).nullish(),
  memberSnapshot: memberSnapshotSchema.optional(),
});

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

function hasTemplateFields(body: z.output<typeof updateCategorySchema>): boolean {
  return (
    body.currency !== undefined ||
    body.amountMinor !== undefined ||
    body.dayOfMonth !== undefined ||
    body.isActive !== undefined ||
    body.paidByMembershipId !== undefined ||
    body.memberSnapshot !== undefined
  );
}

async function assertActivePayer(roomId: string, paidByMembershipId: string) {
  const payer = await db.query.roomMemberships.findFirst({
    columns: { id: true },
    where: (m, { eq, and }) =>
      and(eq(m.id, paidByMembershipId), eq(m.roomId, roomId), eq(m.isActive, true)),
  });
  return !!payer;
}

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const cid = getRouterParam(event, "cid");
  if (!cid) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, updateCategorySchema.parse);

  const category = await db.query.categories.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, cid), eq(c.roomId, roomId)),
  });
  if (!category) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Category not found",
    });
  }

  if (body.name !== undefined) {
    const normalized = normalizeCategoryName(body.name);
    const existing = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.roomId, roomId),
          ne(schema.categories.id, cid),
          sql`lower(trim(${schema.categories.name})) = ${normalized}`,
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "A category with this name already exists in this room.",
      });
    }
  }

  const nextType = body.recurringType ?? category.recurringType;
  const existingTemplate = await db.query.recurringTemplates.findFirst({
    where: (t, { and, eq }) => and(eq(t.categoryId, cid), eq(t.roomId, roomId)),
  });

  let createTemplate: z.output<typeof templateFields> | null = null;
  let templateUpdates: Record<string, unknown> | null = null;

  if (nextType === "recurring") {
    if (!existingTemplate) {
      const parsed = templateFields.safeParse(body);
      if (!parsed.success) {
        return createResponse({
          code: ApiResponseCode.InvalidRequest,
          message: parsed.error.issues[0]?.message ?? "Recurring categories need a template.",
        });
      }
      createTemplate = parsed.data;
    } else if (hasTemplateFields(body)) {
      templateUpdates = { updatedAt: new Date() };
      if (body.currency !== undefined) templateUpdates.currency = body.currency;
      if (body.amountMinor !== undefined) templateUpdates.amountMinor = body.amountMinor;
      if (body.dayOfMonth !== undefined) templateUpdates.dayOfMonth = body.dayOfMonth;
      if (body.isActive !== undefined) templateUpdates.isActive = body.isActive;
      if (body.paidByMembershipId !== undefined) {
        templateUpdates.paidByMembershipId = body.paidByMembershipId ?? null;
      }
      if (body.memberSnapshot !== undefined) templateUpdates.memberSnapshot = body.memberSnapshot;
    }
  }

  const paidBy = createTemplate?.paidByMembershipId ?? body.paidByMembershipId;
  if (paidBy && (createTemplate || body.paidByMembershipId !== undefined)) {
    if (!(await assertActivePayer(roomId, paidBy))) {
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Payer must be an active member of this room.",
      });
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  if (body.recurringType !== undefined) updates.recurringType = body.recurringType;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.categories)
      .set(updates)
      .where(and(eq(schema.categories.id, cid), eq(schema.categories.roomId, roomId)));
  }

  if (createTemplate) {
    await db.insert(schema.recurringTemplates).values({
      id: newId(),
      roomId,
      categoryId: cid,
      currency: createTemplate.currency,
      amountMinor: createTemplate.amountMinor,
      dayOfMonth: createTemplate.dayOfMonth,
      isActive: createTemplate.isActive,
      paidByMembershipId: createTemplate.paidByMembershipId ?? null,
      memberSnapshot: createTemplate.memberSnapshot,
    });
  } else if (templateUpdates && existingTemplate) {
    await db
      .update(schema.recurringTemplates)
      .set(templateUpdates)
      .where(
        and(
          eq(schema.recurringTemplates.id, existingTemplate.id),
          eq(schema.recurringTemplates.roomId, roomId),
        ),
      );
  }

  const updated = await db.query.categories.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, cid), eq(c.roomId, roomId)),
  });
  if (!updated) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to update category",
    });
  }

  const template =
    nextType === "recurring"
      ? await db.query.recurringTemplates.findFirst({
          where: (t, { and, eq }) => and(eq(t.categoryId, cid), eq(t.roomId, roomId)),
        })
      : null;

  if (template?.isActive) {
    try {
      await materializeRecurringDrafts({ roomId, monthKey: monthKey() });
    } catch (e) {
      console.error("[categories.patch] immediate materialization failed", e);
    }
  }

  return createResponse({ code: ApiResponseCode.Success }, { category: updated });
});
