<script setup lang="ts">
useHead({ title: "Settle · Tricker" });

const { roomId } = useScopedRoom();
const { currentRole, currentRoom } = useRoomMemberships();
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

function transferTotal(plan: SettleData["usd"]) {
  return formatMoney({
    amount_minor: plan.suggestTransfer.reduce(
      (total: number, transfer: { amountMinor: number }) => total + transfer.amountMinor,
      0,
    ),
    currency: plan.currency,
  });
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
  <UContainer class="max-w-6xl space-y-5">
    <div
      class="flex flex-col justify-between gap-4 border-b border-default pb-5 lg:flex-row lg:items-end"
    >
      <div class="min-w-0 space-y-1.5">
        <p class="flex items-center gap-2 font-mono text-xs tracking-wider text-muted uppercase">
          Household <span>·</span>
          <span class="truncate normal-case">{{ currentRoom?.name ?? "Room" }}</span>
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Settlement</h1>
          <UBadge
            v-if="data?.snapshot && data?.settle"
            :label="monthClosed ? 'Closed' : 'Open'"
            :color="monthClosed ? 'neutral' : 'success'"
            variant="subtle"
            :icon="monthClosed ? 'i-lucide-lock' : 'i-lucide-circle-dot'"
            class="rounded-full"
          />
        </div>
        <p class="text-sm text-muted">
          {{ monthLabel }} · Review balances and suggested transfers.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          icon="i-lucide-arrow-left"
          label="Back to overview"
          color="neutral"
          variant="subtle"
          :to="`/rooms/${roomId}/dashboard`"
        />
        <UButton
          v-if="isAdmin && data?.snapshot && data?.settle"
          :icon="monthClosed ? 'i-lucide-lock-open' : 'i-lucide-lock'"
          :label="monthClosed ? 'Reopen month' : 'Close month'"
          color="neutral"
          variant="outline"
          :loading="closingMonth"
          @click="onMonthAction"
        />
      </div>
    </div>

    <div
      v-if="settleStatus === 'pending' || settleStatus === 'idle'"
      class="grid gap-5 lg:grid-cols-2"
      role="status"
      aria-label="Loading settlement"
    >
      <USkeleton v-for="i in 2" :key="i" class="h-96 rounded-lg" />
    </div>

    <UAlert
      v-else-if="settleStatus === 'error' || !data?.snapshot || !data?.settle"
      title="Could not load settlement"
      description="Your room data is unavailable. Please try again."
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :actions="[
        { label: 'Try again', color: 'error', variant: 'outline', onClick: () => refresh() },
      ]"
    />

    <div v-else class="grid items-start gap-5 lg:grid-cols-2">
      <UCard
        v-for="plan in plans"
        :key="plan.currency"
        :ui="{ header: 'p-4 sm:px-5 sm:py-4', body: 'p-0 sm:p-0' }"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
              >
                <UIcon :name="currencyIcon(plan.currency as Currency)" class="size-5" />
              </span>
              <div class="min-w-0">
                <h2 class="text-sm font-semibold text-highlighted">
                  {{ plan.currency }} settlement
                </h2>
                <p class="mt-0.5 text-xs text-muted">
                  {{ plan.currency === "USD" ? "US dollar ledger" : "Cambodian riel ledger" }}
                </p>
              </div>
            </div>
            <UBadge
              v-if="monthClosed"
              color="neutral"
              variant="subtle"
              icon="i-lucide-lock"
              label="Closed"
            />
          </div>
        </template>

        <div v-if="!plan.hasActivity" class="space-y-3 px-4 py-14 text-center sm:px-5">
          <UIcon name="i-lucide-receipt-text" class="size-8 text-dimmed" />
          <h3 class="text-sm font-semibold text-highlighted">No {{ plan.currency }} activity</h3>
          <p class="text-sm text-muted">
            Balances will appear when bills are published this month.
          </p>
        </div>

        <template v-else>
          <div class="border-b border-default px-4 py-4 sm:px-5">
            <p class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
              To settle
            </p>
            <div class="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p
                class="font-mono text-2xl font-semibold tracking-tight text-highlighted tabular-nums"
              >
                {{ transferTotal(plan) }}
              </p>
              <p class="text-xs text-muted">
                {{ plan.suggestTransfer.length }} suggested transfer{{
                  plan.suggestTransfer.length === 1 ? "" : "s"
                }}
              </p>
            </div>
          </div>

          <section class="border-b border-default">
            <div class="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <h3 class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
                Roommate balances
              </h3>
              <span class="text-xs text-dimmed">{{ monthLabel }}</span>
            </div>
            <ul class="divide-y divide-default">
              <li
                v-for="member in plan.members"
                :key="member.membershipId"
                class="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <UAvatar
                    :text="payerInitials(member.name)"
                    :alt="member.name"
                    color="neutral"
                    size="sm"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-highlighted">{{ member.name }}</p>
                    <p class="text-xs text-muted">
                      {{ member.balance > 0 ? "Gets back" : member.balance < 0 ? "Owes" : "Even" }}
                    </p>
                  </div>
                </div>
                <p
                  class="shrink-0 font-mono text-sm font-semibold tabular-nums"
                  :class="
                    member.balance > 0
                      ? 'text-success'
                      : member.balance < 0
                        ? 'text-error'
                        : 'text-muted'
                  "
                >
                  {{ signedBalance(member.balance, member.balanceFormatted) }}
                </p>
              </li>
            </ul>
          </section>

          <section class="space-y-3 p-4 sm:p-5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
                Suggested transfers
              </h3>
              <UIcon name="i-lucide-arrow-right-left" class="size-4 text-dimmed" />
            </div>
            <ul v-if="plan.suggestTransfer.length" class="space-y-2">
              <li
                v-for="transfer in plan.suggestTransfer"
                :key="`${transfer.fromMembershipId}-${transfer.toMembershipId}`"
                class="flex items-start gap-2.5 rounded-md border border-default bg-muted/50 p-3"
              >
                <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-4 shrink-0 text-muted" />
                <p class="min-w-0 text-sm leading-relaxed wrap-break-word">
                  <span class="font-medium text-highlighted">{{ transfer.fromName }}</span>
                  pays <span class="font-medium text-highlighted">{{ transfer.toName }}</span>
                  {{ " "
                  }}<span class="font-mono font-semibold text-highlighted">{{
                    transfer.amountFormatted
                  }}</span>
                </p>
              </li>
            </ul>
            <div v-else class="flex items-start gap-2 text-sm text-muted">
              <UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" />
              <p>Everyone is even. No transfers needed.</p>
            </div>
            <p class="text-xs leading-relaxed text-muted">
              Suggested transfers are calculated from published bills and their splits.
            </p>
          </section>
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
