import { and, eq, gte, lt, isNotNull } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  await requireRoomContext(event, roomId);

  const [categoryRows, templateRows] = await Promise.all([
    db.query.categories.findMany({
      where: (c, { eq }) => eq(c.roomId, roomId),
      orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
    }),
    db.query.recurringTemplates.findMany({
      where: (t, { eq }) => eq(t.roomId, roomId),
    }),
  ]);

  const templateByCategory = new Map(templateRows.map((t) => [t.categoryId, t]));

  const range = monthRange(monthKey());
  const materializedRows = await db
    .select({ templateId: schema.entries.templateId, id: schema.entries.id })
    .from(schema.entries)
    .where(
      and(
        eq(schema.entries.roomId, roomId),
        isNotNull(schema.entries.templateId),
        gte(schema.entries.date, range.start.toDate()) as never,
        lt(schema.entries.date, range.end.toDate()) as never,
      ),
    );
  const currentEntryByTemplate = new Map<string, string>();
  for (const row of materializedRows) {
    if (row.templateId) currentEntryByTemplate.set(row.templateId, row.id);
  }

  const rows = categoryRows.map((c) => {
    const template = templateByCategory.get(c.id) ?? null;
    return {
      ...c,
      template,
      currentEntryId: template ? (currentEntryByTemplate.get(template.id) ?? null) : null,
    };
  });

  return createResponse({ code: ApiResponseCode.Success }, rows);
});
