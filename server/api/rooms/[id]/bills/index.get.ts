import { and, asc, eq } from "drizzle-orm";
import { db } from "hub:db";
import { billWeights, bills } from "hub:db:schema";
import { billListQuerySchema } from "~~/shared/schemas/bill";
import { monthRange } from "~~/shared/types/date";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) throw createError({ statusCode: 400, statusMessage: "Missing room id" });

  await requireRoomContext(event, roomId);
  const query = await getValidatedQuery(event, billListQuerySchema.parse);

  const whereParts = [eq(bills.roomId, roomId)];
  if (query.status) whereParts.push(eq(bills.status, query.status));
  if (query.categoryId) whereParts.push(eq(bills.categoryId, query.categoryId));
  if (query.month) {
    const { start, end } = monthRange(query.month);
    whereParts.push(eq(bills.date, start) as never);
    whereParts.push(eq(bills.date, end) as never);
  }

  const rows = await db
    .select()
    .from(bills)
    .where(and(...whereParts))
    .orderBy(asc(bills.date), asc(bills.createdAt));

  const weightRows = await db
    .select()
    .from(billWeights)
    .where(eq(billWeights.billId, rows[0]?.id ?? "_"));

  const weightsByBill = new Map<string, typeof weightRows>();
  for (const w of weightRows) {
    if (!weightsByBill.has(w.billId)) weightsByBill.set(w.billId, []);
    weightsByBill.get(w.billId)!.push(w);
  }

  return {
    bills: rows.map((b) => ({
      ...b,
      weights: weightsByBill.get(b.id) ?? [],
    })),
  };
});
