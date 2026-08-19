import { db, schema } from "@nuxthub/db";
import { z } from "zod";

const bodySchema = z.object({
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
  const body = await readValidatedBody(event, bodySchema.parse);

  const roomId = newId();
  const membershipId = newId();

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
    DEFAULT_CATEGORIES.map((cat) =>
      db.insert(schema.categories).values({
        id: newId(),
        roomId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        recurringType: cat.recurringType,
      }),
    ),
  ]);

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
