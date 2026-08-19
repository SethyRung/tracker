import { db } from "@nuxthub/db";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["draft", "published"]).optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  categoryId: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);
  const query = await getValidatedQuery(event, querySchema.parse);
  const range = monthRange(query.month ?? "");
  const start = range.start.toDate();
  const end = range.end.toDate();

  const [entryRows, memberRows, categoryRows] = await Promise.all([
    db.query.entries.findMany({
      where: (e, { eq, and, gte, lt }) =>
        and(
          eq(e.roomId, roomId),
          query.status ? eq(e.status, query.status) : undefined,
          query.categoryId ? eq(e.categoryId, query.categoryId) : undefined,
          query.month ? gte(e.date, start) : undefined,
          query.month ? lt(e.date, end) : undefined,
        ),
      orderBy: (e, { asc }) => [asc(e.date), asc(e.createdAt)],
    }),
    db.query.roomMemberships.findMany({
      where: (m, { eq, and }) => and(eq(m.roomId, roomId), eq(m.isActive, true)),
      orderBy: (m) => m.joinedAt,
    }),
    db.query.categories.findMany({
      where: (c, { eq }) => eq(c.roomId, roomId),
    }),
  ]);

  const weightRows = entryRows.length
    ? await db.query.entryWeights.findMany({
        where: (w, { inArray }) =>
          inArray(
            w.entryId,
            entryRows.map((e) => e.id),
          ),
      })
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
