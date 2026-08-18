import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "hub:db";
import { categories, entries, entryWeights, roomMemberships } from "hub:db:schema";
import { z } from "zod";
import { BPS_TOTAL } from "~~/shared/types/weight";
import { assertMonthOpenForDate } from "~~/server/utils/month";

const weightEntrySchema = z.object({
  membershipId: z.string().min(1),
  weightBps: z.number().int().min(0).max(BPS_TOTAL),
});

const weightsSchema = z
  .array(weightEntrySchema)
  .min(1, "At least one attendee is required")
  .superRefine((entries, ctx) => {
    const total = entries.reduce((sum, e) => sum + e.weightBps, 0);
    if (Math.abs(total - BPS_TOTAL) > 0.0001) {
      ctx.addIssue({
        code: "custom",
        message: `Weights sum to ${total.toFixed(4)}, expected ${BPS_TOTAL.toFixed(4)}`,
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

const createEntrySchema = z.object({
  categoryId: z.string().nullable().optional(),
  currency: z.enum(["USD", "KHR"]),
  amountMinor: z.number().int().nonnegative(),
  date: z.coerce.date(),
  paidByMembershipId: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  weights: weightsSchema,
  templateId: z.string().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, createEntrySchema.parse);

  // Phase 8: refuse if the target month is closed. SPEC §9: closed blocks
  // ALL edits including admin; reopen to mutate.
  try {
    await assertMonthOpenForDate(roomId, body.date);
  } catch (e) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: e instanceof Error ? e.message : "Month is closed.",
    });
  }

  // User-created entries are always published (instant). Drafts are only
  // materialized by recurring templates (Phase 7), not via this route.
  const status = "published" as const;
  const templateId = body.templateId ?? null;

  const attendeeIds = new Set(body.weights.map((w) => w.membershipId));
  const active = await db
    .select({ id: roomMemberships.id })
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        eq(roomMemberships.isActive, true),
        inArray(roomMemberships.id, [...attendeeIds]),
      ),
    );
  if (active.length !== attendeeIds.size) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "One or more attendees are not active members of this room.",
    });
  }

  // A category with recurringType 'once' allows only one entry per (ICT) month.
  if (body.categoryId) {
    const cat = await db
      .select({ recurringType: categories.recurringType })
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.roomId, roomId)))
      .limit(1);
    if (cat[0]?.recurringType === "once") {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: PHNOM_PENH_TZ,
        year: "numeric",
        month: "2-digit",
      }).formatToParts(body.date);
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      if (y && m) {
        const { start, end } = monthRange(`${y}-${m}`);
        const existing = await db
          .select({ id: entries.id })
          .from(entries)
          .where(
            and(
              eq(entries.roomId, roomId),
              eq(entries.categoryId, body.categoryId),
              gte(entries.date, start.toDate()),
              lt(entries.date, end.toDate()),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          return createResponse({
            code: ApiResponseCode.InvalidRequest,
            message:
              "This category allows only one entry per month. Edit the existing entry instead.",
          });
        }
      }
    }
  }

  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(entries).values({
      id,
      roomId,
      categoryId: body.categoryId ?? null,
      currency: body.currency,
      amountMinor: body.amountMinor,
      date: body.date,
      paidByMembershipId: body.paidByMembershipId,
      notes: body.notes ?? null,
      status,
      templateId,
      createdByUserId: ctx.userId,
    });
    if (body.weights.length > 0) {
      await tx.insert(entryWeights).values(
        body.weights.map((w) => ({
          entryId: id,
          membershipId: w.membershipId,
          weightBps: w.weightBps,
        })),
      );
    }
  });

  const created = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
  const weights = await db.select().from(entryWeights).where(eq(entryWeights.entryId, id));
  const entry = { ...created[0], weights };
  return createResponse({ code: ApiResponseCode.Success }, { entry });
});
