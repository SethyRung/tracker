import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1).max(80),
  usdEnabled: z.boolean().default(true),
  khrEnabled: z.boolean().default(true),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  const roomId = newId();
  const membershipId = newId();
  const rentCategoryId = newId();
  const categoryRows = [
    { id: rentCategoryId, name: "Rent", sortOrder: 0, recurringType: "recurring" as const },
    { id: newId(), name: "Utilities", sortOrder: 1, recurringType: "once" as const },
    { id: newId(), name: "Food", sortOrder: 2, recurringType: "unlimited" as const },
    { id: newId(), name: "Supplies", sortOrder: 3, recurringType: "unlimited" as const },
  ];

  await Promise.all([
    db.insert(schema.rooms).values({
      id: roomId,
      name: body.name,
      createdByUserId: session.user.id,
      usdEnabled: body.usdEnabled,
      khrEnabled: body.khrEnabled,
    }),
    db.insert(schema.roomMemberships).values({
      id: membershipId,
      roomId,
      userId: session.user.id,
      role: "admin",
      displayName: session.user.name ?? session.user.email,
      sharePercentBps: 10000,
    }),
    ...categoryRows.map((cat) =>
      db.insert(schema.categories).values({
        id: cat.id,
        roomId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        recurringType: cat.recurringType,
      }),
    ),
  ]);

  // Seed the Rent recurring template: attendees = every active member split
  // equally, amount left at 0 for the user to fill in. Active so it behaves
  // like a user-created recurring category (materializes the current month).
  const members = await db
    .select({ id: schema.roomMemberships.id })
    .from(schema.roomMemberships)
    .where(
      and(eq(schema.roomMemberships.roomId, roomId), eq(schema.roomMemberships.isActive, true)),
    )
    .orderBy(schema.roomMemberships.joinedAt);

  const memberSnapshot = equalSplitSnapshot(members.map((m) => m.id));
  const rentCurrency = body.usdEnabled ? "USD" : "KHR";

  if (memberSnapshot.length > 0) {
    await db.insert(schema.recurringTemplates).values({
      id: newId(),
      roomId,
      categoryId: rentCategoryId,
      currency: rentCurrency,
      amountMinor: 0,
      dayOfMonth: 1,
      isActive: true,
      paidByMembershipId: membershipId,
      memberSnapshot,
    });

    try {
      await materializeRecurringDrafts({ roomId, monthKey: monthKey() });
    } catch (e) {
      console.error("[rooms.post] recurring materialization failed", e);
    }
  }

  const room = await db.query.rooms.findFirst({
    where: (r, { eq }) => eq(r.id, roomId),
  });

  if (!room) {
    return createResponse({
      code: ApiResponseCode.InternalError,
      message: "Failed to create room",
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, room);
});