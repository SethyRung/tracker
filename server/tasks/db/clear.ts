import { sql } from "drizzle-orm";
import { db } from "@nuxthub/db";

const TABLES = [
  "entry_weights",
  "entries",
  "recurring_templates",
  "invite_links",
  "month_snapshots",
  "room_memberships",
  "categories",
  "rooms",
  "verification",
  "session",
  "account",
  "user",
] as const;

export default defineTask({
  meta: {
    name: "db:clear",
    description:
      "DELETE every row from all app + Better-Auth tables. Dev/local only — refuses in other environments.",
  },
  async run() {
    const env = process.env.NODE_ENV;
    if (env !== "development") {
      return {
        result: "skipped",
        reason: `db:clear is disabled in NODE_ENV=${env ?? "<unset>"}`,
      };
    }

    for (const name of TABLES) {
      await db.execute(sql`DELETE FROM ${sql.identifier(name)}`);
    }

    return { result: "ok", cleared: [...TABLES] };
  },
});
