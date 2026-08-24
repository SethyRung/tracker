import { inArray, isNotNull } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

const PURGE_AFTER_DAYS = 30;

export default defineTask({
  meta: {
    name: "rooms:purge",
    description: "Hard-delete rooms whose deletedAt is older than 30 days.",
  },
  async run() {
    const tombstones = await db
      .select({ id: schema.rooms.id, deletedAt: schema.rooms.deletedAt })
      .from(schema.rooms)
      .where(isNotNull(schema.rooms.deletedAt));

    const now = new Date();
    const expiredIds = tombstones
      .filter((room) => isPurgeEligible(room, now, PURGE_AFTER_DAYS))
      .map((room) => room.id);

    if (expiredIds.length === 0) {
      return { result: "ok", purged: 0 };
    }

    await db.delete(schema.rooms).where(inArray(schema.rooms.id, expiredIds));

    return { result: "ok", purged: expiredIds.length };
  },
});
