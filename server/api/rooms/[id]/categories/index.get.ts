import { db } from "@nuxthub/db";

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

  const rows = categoryRows.map((c) => ({
    ...c,
    template: templateByCategory.get(c.id) ?? null,
  }));

  return createResponse({ code: ApiResponseCode.Success }, rows);
});
