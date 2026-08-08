import { eq } from "drizzle-orm";
import { db } from "hub:db";
import { categories, roomMemberships, rooms } from "hub:db:schema";
import { createRoomSchema } from "~~/shared/schemas/room";
import { newId } from "~~/server/utils/room";

const DEFAULT_CATEGORIES = [
  { name: "Rent", sortOrder: 0 },
  { name: "Utilities", sortOrder: 1 },
  { name: "Food", sortOrder: 2 },
  { name: "Supplies", sortOrder: 3 },
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
      });
    }
  });

  const created = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  return { room: created[0] };
});
