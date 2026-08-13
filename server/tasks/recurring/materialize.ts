import { materializeRecurringDrafts } from "~~/server/utils/recurring";

export default defineTask({
  meta: {
    name: "recurring:materialize",
    description:
      "On the 1st of each (ICT) month, create published entries from every active recurring template.",
  },
  async run() {
    if (currentDayOfMonth() !== 1) {
      return { result: "skipped", reason: "today is not the 1st of the ICT month" };
    }

    const result = await materializeRecurringDrafts();
    return { result: "ok", ...result };
  },
});
