import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { bills } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) throw createError({ statusCode: 400, statusMessage: "Missing id" });

  await requireRoomAdmin(event, roomId);

  const current = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, bid), eq(bills.roomId, roomId)))
    .limit(1);
  if (current.length === 0) throw createError({ statusCode: 404, statusMessage: "Bill not found" });
  if (current[0]!.status === "published") {
    return { bill: current[0], alreadyPublished: true };
  }

  await db
    .update(bills)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(bills.id, bid));

  const updated = await db.select().from(bills).where(eq(bills.id, bid)).limit(1);
  return { bill: updated[0], alreadyPublished: false };
});
