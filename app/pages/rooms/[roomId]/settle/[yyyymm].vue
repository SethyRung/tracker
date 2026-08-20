<script setup lang="ts">
useHead({ title: "Settle · Tricker" });

const { roomId } = useScopedRoom();
const { currentRole } = useRoomMemberships();
const isAdmin = computed(() => currentRole.value === "admin");

const route = useRoute();
const toast = useToast();

const yyyymm = computed(() => route.params.yyyymm as string);

const monthLabel = computed(() => toDayJS(yyyymm.value, "YYYY-MM").format("MMMM YYYY"));

const monthFetch = useFetch(() => `/api/rooms/${roomId.value}/months/${yyyymm.value}`, {
  transform: (r) => (isSuccessResponse(r) ? r.data : null),
});
const settleFetch = useFetch(() => `/api/rooms/${roomId.value}/settle/${yyyymm.value}`, {
  transform: (r) => (isSuccessResponse(r) ? r.data : null),
});
const [
  { data: monthSnapshot, refresh: refreshMonth },
  { data: settleRes, refresh: refreshSettle },
] = await Promise.all([monthFetch, settleFetch]);

type SettleData = NonNullable<typeof settleRes.value>;

const plans = computed<SettleData["usd"][]>(() =>
  settleRes.value ? [settleRes.value.usd, settleRes.value.khr] : [],
);

const currencyIcon = (currency: string) =>
  currency === "USD" ? "i-lucide-dollar-sign" : "i-lucide-coins";

function signedBalance(balance: number, formatted: string) {
  if (balance > 0) return `+${formatted}`;
  if (balance < 0) return formatted.replace("-", "−");
  return formatted;
}

const monthClosed = computed(() => monthSnapshot.value?.status === "closed");

const closingMonth = ref(false);
const showCloseModal = ref(false);

function onMonthAction() {
  if (!roomId.value || !isAdmin.value) return;
  if (monthClosed.value) {
    void runMonthAction("reopen");
    return;
  }
  showCloseModal.value = true;
}

async function runMonthAction(action: "close" | "reopen") {
  if (!roomId.value || !isAdmin.value) return;
  closingMonth.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/months/${yyyymm.value}/${action}`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    showCloseModal.value = false;
    await Promise.all([refreshMonth(), refreshSettle()]);
    toast.add({
      icon: "i-lucide-circle-check",
      title: action === "close" ? "Month closed" : "Month reopened",
      description:
        action === "close"
          ? "No further edits or deletions are allowed for this month."
          : "You can now make edits and deletions again.",
    });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not update month.",
    });
  } finally {
    closingMonth.value = false;
  }
}
</script>

<template>
  <UContainer class="max-w-4xl py-6 space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Settlement</p>
        <h1 class="font-pixel-circle text-2xl text-primary">{{ monthLabel }}</h1>
      </div>

      <div class="flex items-center gap-2">
        <UBadge
          :label="monthClosed ? 'Closed' : 'Open'"
          :color="monthClosed ? 'neutral' : 'primary'"
          :variant="monthClosed ? 'subtle' : 'soft'"
          :icon="monthClosed ? 'i-lucide-lock' : 'i-lucide-circle-dot'"
        />

        <UButton
          v-if="isAdmin"
          :icon="monthClosed ? 'i-lucide-lock-open' : 'i-lucide-lock'"
          :color="monthClosed ? 'primary' : 'error'"
          size="xs"
          variant="outline"
          :loading="closingMonth"
          @click="onMonthAction"
        />
      </div>
    </div>

    <p v-if="!settleRes" class="text-sm text-toned text-center py-12">Loading…</p>

    <div v-else class="grid md:grid-cols-2 gap-4">
      <UCard v-for="plan in plans" :key="plan.currency" variant="outline">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon :name="currencyIcon(plan.currency)" class="size-4 text-toned" />
              <h2 class="font-mono text-xs font-semibold uppercase tracking-wider text-toned">
                {{ plan.currency }}
              </h2>
            </div>
            <UBadge v-if="monthClosed" color="neutral" variant="subtle" size="xs">locked</UBadge>
          </div>
        </template>

        <div v-if="!plan.hasActivity" class="text-center py-6 space-y-1">
          <UIcon name="i-lucide-receipt" class="size-6 text-dimmed mx-auto" />
          <p class="text-sm text-muted">No {{ plan.currency }} activity this month</p>
        </div>

        <template v-else>
          <p v-if="plan.suggestTransfer.length > 0" class="text-xs text-toned mb-3">
            {{ plan.suggestTransfer.length }} transfer{{
              plan.suggestTransfer.length === 1 ? "" : "s"
            }}
            · {{ plan.totalImbalanceFormatted }} to move
          </p>

          <p class="text-xs font-semibold text-toned mb-2">Balances</p>
          <ul class="space-y-1.5 mb-4">
            <li
              v-for="m in plan.members"
              :key="m.membershipId"
              class="flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="size-2 rounded-full shrink-0"
                  :style="{ backgroundColor: m.color ?? '#a1a1aa' }"
                />
                <span class="text-sm truncate">{{ m.name }}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="m.balance > 0" class="text-xs text-toned">gets</span>
                <span v-else-if="m.balance < 0" class="text-xs text-toned">owes</span>
                <span v-else class="text-xs text-dimmed">even</span>
                <span
                  class="text-sm font-medium tabular-nums"
                  :class="
                    m.balance > 0 ? 'text-success' : m.balance < 0 ? 'text-error' : 'text-toned'
                  "
                >
                  {{ signedBalance(m.balance, m.balanceFormatted) }}
                </span>
              </div>
            </li>
          </ul>

          <div v-if="plan.suggestTransfer.length > 0" class="border-t border-default pt-3">
            <p class="text-xs font-semibold text-toned">Suggested transfers</p>
            <p class="text-[10px] text-toned mb-2">(minimum to settle)</p>
            <ul class="space-y-1.5">
              <li
                v-for="t in plan.suggestTransfer"
                :key="`${t.fromMembershipId}-${t.toMembershipId}`"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="truncate">{{ t.fromName }}</span>
                  <UIcon name="i-lucide-arrow-right" class="size-3.5 text-dimmed shrink-0" />
                  <span class="truncate">{{ t.toName }}</span>
                </div>
                <span class="font-medium tabular-nums text-primary shrink-0">{{
                  t.amountFormatted
                }}</span>
              </li>
            </ul>
          </div>

          <div v-else class="text-center py-4 space-y-1">
            <UIcon name="i-lucide-circle-check" class="size-6 text-success mx-auto" />
            <p class="text-sm text-default">Everyone is settled up</p>
            <p v-if="plan.isSettled" class="text-xs text-dimmed">
              Everyone paid exactly their own share — no transfers needed.
            </p>
          </div>
        </template>
      </UCard>
    </div>

    <UModal
      v-model:open="showCloseModal"
      :title="`Close ${monthLabel}?`"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm text-toned mb-2">After closing:</p>
        <ul class="text-sm text-toned space-y-1 list-disc pl-5">
          <li>No edits or deletions</li>
          <li>Settlement is locked</li>
          <li>You can re-open later if needed</li>
        </ul>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="closingMonth"
          @click="showCloseModal = false"
        />
        <UButton label="Close month" :loading="closingMonth" @click="runMonthAction('close')" />
      </template>
    </UModal>
  </UContainer>
</template>