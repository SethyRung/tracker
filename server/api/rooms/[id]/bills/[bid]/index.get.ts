import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { billWeights, bills } from "hub:db:schema";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) throw createError({ statusCode: 400, statusMessage: "Missing id" });

  await requireRoomContext(event, roomId);

  const rows = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, bid), eq(bills.roomId, roomId)))
    .limit(1);
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: "Bill not found" });

  const weights = await db.select().from(billWeights).where(eq(billWeights.billId, bid));
  return { bill: { ...rows[0], weights } };
});
