import { db } from "@nuxthub/db";
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
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);
  const query = await getValidatedQuery(event, entryListQuerySchema.parse);

  const rows = await db.query.entries.findMany({
    where: (e, { eq, and, gte, lt }) => {
      const parts = [eq(e.roomId, roomId)];
      if (query.status) parts.push(eq(e.status, query.status));
      if (query.categoryId) parts.push(eq(e.categoryId, query.categoryId));
      if (query.month) {
        const range = monthRange(query.month);
        parts.push(gte(e.date, range.start.toDate()));
        parts.push(lt(e.date, range.end.toDate()));
      }
      return and(...parts);
    },
    orderBy: (e, { asc }) => [asc(e.date), asc(e.createdAt)],
  });

  const weightRows = rows.length
    ? await db.query.entryWeights.findMany({
        where: (w, { inArray }) =>
          inArray(
            w.entryId,
            rows.map((e) => e.id),
          ),
      })
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
  return createResponse({ code: ApiResponseCode.Success }, entriesData);
});
