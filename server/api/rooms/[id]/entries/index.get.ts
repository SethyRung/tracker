import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "hub:db";
import { entries, entryWeights } from "hub:db:schema";
import { z } from "zod";

const entryStatusSchema = z.enum(["draft", "published"]);

const entryListQuerySchema = z.object({
  status: entryStatusSchema.optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  categoryId: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  await requireRoomContext(event, roomId);
  const query = await getValidatedQuery(event, entryListQuerySchema.parse);

  const whereParts = [eq(entries.roomId, roomId)];
  if (query.status) whereParts.push(eq(entries.status, query.status));
  if (query.categoryId) whereParts.push(eq(entries.categoryId, query.categoryId));
  if (query.month) {
    const range = monthRange(query.month ?? "");
    const start = range.start.toDate();
    const end = range.end.toDate();
    whereParts.push(gte(entries.date, start) as never);
    whereParts.push(lt(entries.date, end) as never);
  }

  const rows = await db
    .select()
    .from(entries)
    .where(and(...whereParts))
    .orderBy(asc(entries.date), asc(entries.createdAt));

  // Load weights for every fetched entry in one query (the old bill list route
  // only fetched weights for the first row — this one does it correctly).
  const weightRows = rows.length
    ? await db
        .select()
        .from(entryWeights)
        .where(
          inArray(
            entryWeights.entryId,
            rows.map((e) => e.id),
          ),
        )
    : [];

  const weightsByEntry = new Map<string, typeof weightRows>();
  for (const w of weightRows) {
    if (!weightsByEntry.has(w.entryId)) weightsByEntry.set(w.entryId, []);
    weightsByEntry.get(w.entryId)!.push(w);
  }

  const entriesData = rows.map((e) => ({
    ...e,
    weights: weightsByEntry.get(e.id) ?? [],
  }));
  return createResponse({ code: ApiResponseCode.Success }, { entries: entriesData });
});
