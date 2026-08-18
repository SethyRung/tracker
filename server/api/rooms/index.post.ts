import { eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories, roomMemberships, rooms } from "hub:db:schema";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().min(1).max(80),
  usdEnabled: z.boolean().default(true),
  khrEnabled: z.boolean().default(true),
});

const DEFAULT_CATEGORIES = [
  { name: "Rent", sortOrder: 0, recurringType: "recurring" as const },
  { name: "Utilities", sortOrder: 1, recurringType: "once" as const },
  { name: "Food", sortOrder: 2, recurringType: "unlimited" as const },
  { name: "Supplies", sortOrder: 3, recurringType: "unlimited" as const },
];

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const body = await readValidatedBody(event, createRoomSchema.parse);

  const roomId = newId();
  const membershipId = newId();

  await db.transaction(async (tx) => {
    await tx.insert(rooms).values({
      id: roomId,
      name: body.name,
      createdByUserId: session.user.id,
      usdEnabled: body.usdEnabled,
      khrEnabled: body.khrEnabled,
    });

    await tx.insert(roomMemberships).values({
      id: membershipId,
      roomId,
      userId: session.user.id,
      role: "admin",
      displayName: session.user.name ?? session.user.email,
      sharePercentBps: 10000,
    });

    for (const cat of DEFAULT_CATEGORIES) {
      await tx.insert(categories).values({
        id: newId(),
        roomId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        recurringType: cat.recurringType,
      });
    }
  });

  const created = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  const room = created[0];
  return createResponse({ code: ApiResponseCode.Success }, { room });
});
