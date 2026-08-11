import { materializeRecurringDrafts, currentDayOfMonthPhnomPenh } from "~~/server/utils/recurring";

// Materialize draft entries from every active recurring template. Wired up in
// nuxt.config.ts → nitro.scheduledTasks with the cron `0 17 * * *` (17:00 UTC
// = 00:00 Asia/Phnom_Penh). We guard inside so a stray fire outside the 1st of
// the ICT month is a no-op (defense-in-depth — Croner timing is system-clock
// dependent and deployments may run on different TZ offsets).
export default defineTask({
  meta: {
    name: "recurring:materialize",
    description:
      "On the 1st of each (ICT) month, create published entries from every active recurring template.",
  },
  async run() {
    if (currentDayOfMonthPhnomPenh() !== 1) {
      return { result: "skipped", reason: "today is not the 1st of the ICT month" };
    }

    const result = await materializeRecurringDrafts();
    return { result: "ok", ...result };
  },
});
