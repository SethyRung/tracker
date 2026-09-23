<script setup lang="ts">
useHead({ title: "Settle · Tricker" });

const { roomId } = useScopedRoom();
const { currentRole } = useRoomMemberships();
const isAdmin = computed(() => currentRole.value === "admin");

const route = useRoute();
const toast = useToast();

const yyyymm = computed(() => route.params.yyyymm as string);

const monthLabel = computed(() => toDayJS(yyyymm.value, "YYYY-MM").format("MMMM YYYY"));

const {
  data,
  status: settleStatus,
  refresh,
} = useAuthAsyncData(
  `room-settle:${roomId.value}:${yyyymm.value}`,
  async (requestFetch) => {
    const [monthRes, settleRes] = await Promise.all([
      requestFetch(`/api/rooms/${roomId.value}/months/${yyyymm.value}`),
      requestFetch(`/api/rooms/${roomId.value}/settle/${yyyymm.value}`),
    ]);
    return {
      snapshot: isSuccessResponse(monthRes) ? monthRes.data : null,
      settle: isSuccessResponse(settleRes) ? settleRes.data : null,
    };
  },
  { lazy: true },
);

watch(yyyymm, () => void refresh());

type SettleData = NonNullable<NonNullable<typeof data.value>["settle"]>;

const plans = computed<SettleData["usd"][]>(() => {
  const settle = data.value?.settle;
  return settle ? [settle.usd, settle.khr] : [];
});

function signedBalance(balance: number, formatted: string) {
  if (balance > 0) return `+${formatted}`;
  if (balance < 0) return formatted.replace("-", "−");
  return formatted;
}

const monthClosed = computed(() => data.value?.snapshot?.status === "closed");

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
    await refresh();
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
  <UContainer class="max-w-4xl space-y-6 py-6">
    <div class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs tracking-wider text-toned uppercase">Settlement</p>
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

    <div v-if="settleStatus === 'pending'" class="grid gap-4 md:grid-cols-2">
      <USkeleton v-for="i in 2" :key="i" class="h-72 rounded-xl" />
    </div>

    <p v-else-if="settleStatus === 'error'" class="py-12 text-center text-sm text-toned">
      Could not load settlement.
    </p>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <UCard v-for="plan in plans" :key="plan.currency" variant="outline">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon :name="currencyIcon(plan.currency as Currency)" class="size-4 text-toned" />
              <h2 class="font-mono text-xs font-semibold tracking-wider text-toned uppercase">
                {{ plan.currency }}
              </h2>
            </div>
            <UBadge v-if="monthClosed" color="neutral" variant="subtle" size="xs">locked</UBadge>
          </div>
        </template>

        <div v-if="!plan.hasActivity" class="space-y-1 py-6 text-center">
          <UIcon name="i-lucide-receipt" class="mx-auto size-6 text-dimmed" />
          <p class="text-sm text-muted">No {{ plan.currency }} activity this month</p>
        </div>

        <template v-else>
          <p v-if="plan.suggestTransfer.length > 0" class="mb-3 text-xs text-toned">
            {{ plan.suggestTransfer.length }} transfer{{
              plan.suggestTransfer.length === 1 ? "" : "s"
            }}
            · {{ plan.totalImbalanceFormatted }} to move
          </p>

          <p class="mb-2 text-xs font-semibold text-toned">Balances</p>
          <ul class="mb-4 space-y-1.5">
            <li
              v-for="m in plan.members"
              :key="m.membershipId"
              class="flex items-center justify-between gap-2"
            >
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="size-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: m.color ?? '#a1a1aa' }"
                />
                <span class="truncate text-sm">{{ m.name }}</span>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
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
            <p class="mb-2 text-[10px] text-toned">(minimum to settle)</p>
            <ul class="space-y-1.5">
              <li
                v-for="t in plan.suggestTransfer"
                :key="`${t.fromMembershipId}-${t.toMembershipId}`"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate">{{ t.fromName }}</span>
                  <UIcon name="i-lucide-arrow-right" class="size-3.5 shrink-0 text-dimmed" />
                  <span class="truncate">{{ t.toName }}</span>
                </div>
                <span class="shrink-0 font-medium text-primary tabular-nums">{{
                  t.amountFormatted
                }}</span>
              </li>
            </ul>
          </div>

          <div v-else class="space-y-1 py-4 text-center">
            <UIcon name="i-lucide-circle-check" class="mx-auto size-6 text-success" />
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
        <p class="mb-2 text-sm text-toned">After closing:</p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-toned">
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
