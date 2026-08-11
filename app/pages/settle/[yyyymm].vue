<script setup lang="ts">
useHead({ title: "Settle · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const yyyymm = computed(() => route.params.yyyymm as string);

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

const { data: monthSnapshot, refresh: refreshMonth } = await useFetch(
  () => `/api/rooms/${roomId.value}/months/${yyyymm.value}`,
  {
    transform: (r) => (r?.data?.snapshot ?? null) as { status: "open" | "closed" } | null,
    default: () => null,
  },
);

interface CurrencyPlanView {
  currency: "USD" | "KHR";
  result: { balances: Balance[]; transfers: Transfer[]; totalImbalance: number };
}

interface SettleResponse {
  yyyymm: string;
  plans: { USD: CurrencyPlanView; KHR: CurrencyPlanView };
}

const settleRes = ref<SettleResponse | null>(null);

async function refreshSettle() {
  if (!roomId.value) return;
  const res = await $fetch(`/api/rooms/${roomId.value}/settle/${yyyymm.value}`);
  settleRes.value = res.data as SettleResponse;
}

if (roomId.value) await refreshSettle();
watch([roomId, yyyymm], () => refreshSettle());

const { data: members } = await useFetch(() => `/api/rooms/${roomId.value}/members`, {
  transform: (r) => (r?.data?.members ?? []) as MemberRow[],
  default: () => [] as MemberRow[],
});

interface MemberRow {
  id: string;
  displayName: string;
  color: string | null;
  role: string;
  userId: string;
}

interface Balance {
  membershipId: string;
  paid: number;
  owed: number;
  net: number;
}

interface Transfer {
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
}

const memberById = computed(() => new Map((members.value ?? []).map((m) => [m.id, m])));

const isAdmin = computed(() =>
  (members.value ?? []).some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const monthClosed = computed(() => monthSnapshot.value?.status === "closed");

const closingMonth = ref(false);

async function toggleMonth() {
  if (!roomId.value || !isAdmin.value) return;
  const action = monthClosed.value ? "reopen" : "close";
  if (
    action === "close" &&
    !confirm(
      `Close ${yyyymm.value}? Entries will be locked — no edits, deletes, or publishes until you reopen.`,
    )
  ) {
    return;
  }
  closingMonth.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/months/${yyyymm.value}/${action}`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await refreshMonth();
    toast.add({
      icon: "i-lucide:circle-check",
      title: action === "close" ? "Month closed" : "Month reopened",
    });
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not update month.",
    });
  } finally {
    closingMonth.value = false;
  }
}

function formatAmount(currency: string, amountMinor: number) {
  if (currency === "USD") {
    const sign = amountMinor < 0 ? "-" : "";
    return `${sign}$${(Math.abs(amountMinor) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const sign = amountMinor < 0 ? "-" : "";
  return `${sign}៛${Math.abs(amountMinor).toLocaleString("en-US")}`;
}

function memberLabel(mid: string) {
  return memberById.value.get(mid)?.displayName ?? "—";
}

function memberColor(mid: string) {
  return memberById.value.get(mid)?.color ?? "#a1a1aa";
}

function sortedBalances(balances: Balance[]): Balance[] {
  return [...balances].sort((a, b) => b.net - a.net);
}
</script>

<template>
  <UContainer class="py-4 max-w-4xl">
    <div class="flex items-center justify-between mb-4 gap-3">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Back"
          @click="router.back"
        />
        <div>
          <h1 class="font-pixel-circle text-2xl text-primary">{{ yyyymm }}</h1>
          <p class="text-xs text-toned mt-1">
            <UBadge :color="monthClosed ? 'neutral' : 'primary'" variant="subtle" size="xs">
              {{ monthClosed ? "Closed" : "Open" }}
            </UBadge>
          </p>
        </div>
      </div>
      <UButton
        v-if="isAdmin"
        :icon="monthClosed ? 'i-lucide-lock-open' : 'i-lucide-lock'"
        :label="monthClosed ? 'Reopen' : 'Close month'"
        :color="monthClosed ? 'neutral' : 'primary'"
        variant="outline"
        :loading="closingMonth"
        @click="toggleMonth"
      />
    </div>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before viewing settlements."
    />

    <template v-else-if="!settleRes">
      <p class="text-sm text-toned text-center py-12">Loading…</p>
    </template>

    <template v-else>
      <div class="grid md:grid-cols-2 gap-4">
        <UCard v-for="plan in [settleRes.plans.USD, settleRes.plans.KHR]" :key="plan.currency">
          <template #header>
            <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">
              {{ plan.currency }} settlement
            </h2>
          </template>

          <div v-if="plan.result.balances.length === 0" class="text-sm text-toned py-2">
            No {{ plan.currency }} activity this month.
          </div>

          <template v-else>
            <p class="text-xs font-semibold text-toned mb-2">Balances</p>
            <ul class="space-y-1.5 mb-4">
              <li
                v-for="b in sortedBalances(plan.result.balances).filter((b) => b.net !== 0)"
                :key="b.membershipId"
                class="flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="size-2 rounded-full shrink-0"
                    :style="{ backgroundColor: memberColor(b.membershipId) }"
                  />
                  <span class="text-sm truncate">{{ memberLabel(b.membershipId) }}</span>
                </div>
                <span
                  class="text-sm font-medium tabular-nums"
                  :class="b.net > 0 ? 'text-success' : 'text-error'"
                >
                  {{ formatAmount(plan.currency, b.net) }}
                </span>
              </li>
            </ul>

            <template v-if="plan.result.transfers.length > 0">
              <div class="border-t border-default pt-3">
                <p class="text-xs font-semibold text-toned mb-2">Suggested transfers</p>
                <p class="text-[10px] text-toned mb-2">Minimum to settle</p>
                <ul class="space-y-1.5">
                  <li
                    v-for="t in plan.result.transfers"
                    :key="`${t.fromMembershipId}-${t.toMembershipId}`"
                    class="flex items-center justify-between gap-2 text-sm"
                  >
                    <span class="truncate">
                      {{ memberLabel(t.fromMembershipId) }} → {{ memberLabel(t.toMembershipId) }}
                    </span>
                    <span class="font-medium tabular-nums">{{
                      formatAmount(plan.currency, t.amountMinor)
                    }}</span>
                  </li>
                </ul>
                <p class="text-[10px] text-toned mt-2">
                  {{ plan.result.transfers.length }} transfer{{
                    plan.result.transfers.length === 1 ? "" : "s"
                  }}
                  <span v-if="monthClosed"> · (locked)</span>
                </p>
              </div>
            </template>

            <p v-else class="text-xs text-toned pt-2">✓ Everyone is settled up</p>
          </template>
        </UCard>
      </div>
    </template>
  </UContainer>
</template>
