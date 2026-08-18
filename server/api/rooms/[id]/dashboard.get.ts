import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "hub:db";
import { categories, entries, entryWeights, roomMemberships } from "hub:db:schema";
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
  const range = monthRange(query.month ?? "");
  const start = range.start.toDate();
  const end = range.end.toDate();

  const [entryRows, memberRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.roomId, roomId),
          query.status ? eq(entries.status, query.status) : undefined,
          query.categoryId ? eq(entries.categoryId, query.categoryId) : undefined,
          query.month ? gte(entries.date, start) : undefined,
          query.month ? lt(entries.date, end) : undefined,
        ),
      )
      .orderBy(asc(entries.date), asc(entries.createdAt)),
    db
      .select()
      .from(roomMemberships)
      .where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.isActive, true)))
      .orderBy(roomMemberships.joinedAt),
    db.select().from(categories).where(eq(categories.roomId, roomId)),
  ]);

  const weightRows = entryRows.length
    ? await db
        .select()
        .from(entryWeights)
        .where(
          inArray(
            entryWeights.entryId,
            entryRows.map((e) => e.id),
          ),
        )
    : [];

  const weightsByEntry = new Map<string, typeof weightRows>();
  for (const w of weightRows) {
    if (!weightsByEntry.has(w.entryId)) weightsByEntry.set(w.entryId, []);
    weightsByEntry.get(w.entryId)!.push(w);
  }

  const entriesData = entryRows.map((e) => ({
    ...e,
    weights: weightsByEntry.get(e.id) ?? [],
  }));

  return createResponse(
    { code: ApiResponseCode.Success },
    { entries: entriesData, members: memberRows, categories: categoryRows },
  );
});
