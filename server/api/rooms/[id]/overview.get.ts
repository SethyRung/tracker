import { asc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { user } from "#auth/schema";
import { z } from "zod";
import { buildOverviewSettlement } from "#shared/utils/overview";

const querySchema = z.object({
  month: z
    .string("Choose a valid month")
    .refine(isValidMonthKey, "Choose a month in YYYY-MM format")
    .optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  await requireRoomContext(event, roomId);

  const query = await getValidatedQuery(event, querySchema.parse);
  const yyyymm = query.month ?? monthKey();
  const { start, end } = monthRange(yyyymm);

  const [entryRows, memberRows, categoryRows, snapshot] = await Promise.all([
    db.query.entries.findMany({
      where: (entry, { and, eq, gte, lt }) =>
        and(
          eq(entry.roomId, roomId),
          gte(entry.date, start.toDate()),
          lt(entry.date, end.toDate()),
        ),
      orderBy: (entry, { asc }) => [asc(entry.date), asc(entry.createdAt)],
    }),
    db
      .select({ membership: schema.roomMemberships, userName: user.name })
      .from(schema.roomMemberships)
      .leftJoin(user, eq(user.id, schema.roomMemberships.userId))
      .where(eq(schema.roomMemberships.roomId, roomId))
      .orderBy(asc(schema.roomMemberships.joinedAt)),
    db.query.categories.findMany({
      where: (category, { eq }) => eq(category.roomId, roomId),
    }),
    getMonthSnapshot(roomId, yyyymm),
  ]);

  const weightRows = entryRows.length
    ? await db.query.entryWeights.findMany({
        where: (weight, { inArray }) =>
          inArray(
            weight.entryId,
            entryRows.map((entry) => entry.id),
          ),
      })
    : [];
  const weightsByEntry = new Map<string, typeof weightRows>();
  for (const weight of weightRows) {
    const weights = weightsByEntry.get(weight.entryId) ?? [];
    weights.push(weight);
    weightsByEntry.set(weight.entryId, weights);
  }

  const entries = entryRows.map((entry) => ({
    ...entry,
    weights: weightsByEntry.get(entry.id) ?? [],
  }));
  const members = memberRows.map(({ membership, userName }) => ({
    ...membership,
    userName: userName ?? "",
  }));

  return createResponse(
    { code: ApiResponseCode.Success },
    {
      entries,
      members: members.filter((member) => member.isActive),
      categories: categoryRows,
      snapshot: snapshot ?? {
        id: null,
        roomId,
        yyyymm,
        status: "open" as const,
        closedAt: null,
        closedByUserId: null,
      },
      settlement: { yyyymm, ...buildOverviewSettlement(entries, members) },
    },
  );
});
