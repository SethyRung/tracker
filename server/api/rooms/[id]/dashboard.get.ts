import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { user } from "#auth/schema";
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
    db.select({ membership: schema.roomMemberships, userName: user.name })
      .from(schema.roomMemberships)
      .leftJoin(user, eq(user.id, schema.roomMemberships.userId))
      .where(
        and(eq(schema.roomMemberships.roomId, roomId), eq(schema.roomMemberships.isActive, true)),
      )
      .orderBy(asc(schema.roomMemberships.joinedAt)),
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

  const members = memberRows.map(({ membership, userName }) => ({
    ...membership,
    userName: (userName ?? "") as string,
  }));

  return createResponse(
    { code: ApiResponseCode.Success },
    { entries: entriesData, members, categories: categoryRows },
  );
});
