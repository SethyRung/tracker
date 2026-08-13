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

const monthLabel = computed(() => toDate(yyyymm.value).format("MMMM YYYY"));

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

interface SettleMemberView {
  membershipId: string;
  name: string;
  color: string | null;
  paid: number;
  paidFormatted: string;
  owed: number;
  owedFormatted: string;
  balance: number;
  balanceFormatted: string;
  newBalance: number;
  newBalanceFormatted: string;
}

interface SettleTransferView {
  fromMembershipId: string;
  fromName: string;
  toMembershipId: string;
  toName: string;
  amountFormatted: string;
}

interface SettleCurrencyView {
  currency: "USD" | "KHR";
  members: SettleMemberView[];
  suggestTransfer: SettleTransferView[];
  isSettled: boolean;
  hasActivity: boolean;
}

interface SettleResponse {
  yyyymm: string;
  usd: SettleCurrencyView;
  khr: SettleCurrencyView;
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

const plans = computed<SettleCurrencyView[]>(() =>
  settleRes.value ? [settleRes.value.usd, settleRes.value.khr] : [],
);

const isAdmin = computed(() =>
  (members.value ?? []).some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const monthClosed = computed(() => monthSnapshot.value?.status === "closed");

const closingMonth = ref(false);
const showCloseModal = ref(false);

// Closing is destructive enough to warrant the confirmation dialog in
// MOCKS §5; reopening is not, so it fires straight away.
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
          <h1 class="font-pixel-circle text-2xl text-primary">{{ monthLabel }}</h1>
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
        @click="onMonthAction"
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
        <UCard v-for="plan in plans" :key="plan.currency">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">
                {{ plan.currency }}
              </h2>
              <UBadge v-if="monthClosed" color="neutral" variant="subtle" size="xs">locked</UBadge>
            </div>
          </template>

          <div v-if="!plan.hasActivity" class="text-sm text-toned py-2">
            No {{ plan.currency }} activity this month
          </div>

          <template v-else>
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
                  <div class="min-w-0">
                    <span class="text-sm truncate block">{{ m.name }}</span>
                  </div>
                </div>
                <span
                  class="text-sm font-medium tabular-nums"
                  :class="
                    m.balance > 0 ? 'text-success' : m.balance < 0 ? 'text-error' : 'text-toned'
                  "
                >
                  {{ m.balanceFormatted }}
                </span>
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
                  <span class="truncate">{{ t.fromName }} → {{ t.toName }}</span>
                  <span class="font-medium tabular-nums">{{ t.amountFormatted }}</span>
                </li>
              </ul>
              <p class="text-[10px] text-toned mt-2">
                {{ plan.suggestTransfer.length }} transfer{{
                  plan.suggestTransfer.length === 1 ? "" : "s"
                }}
              </p>
            </div>

            <p v-else class="text-xs text-toned pt-2">
              ✓ Everyone is settled up
              <span v-if="plan.isSettled" class="block mt-1">
                Every member paid exactly their own share, so there is nothing to transfer.
              </span>
            </p>
          </template>
        </UCard>
      </div>
    </template>

    <UModal v-model:open="showCloseModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold">Close {{ monthLabel }}?</h3>
          </template>
          <p class="text-sm text-toned mb-2">After closing:</p>
          <ul class="text-sm text-toned space-y-1 list-disc pl-5">
            <li>No edits or deletions</li>
            <li>Settlement is locked</li>
            <li>You can re-open later if needed</li>
          </ul>
          <div class="flex justify-end gap-2 mt-4">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="closingMonth"
              @click="showCloseModal = false"
            />
            <UButton label="Close month" :loading="closingMonth" @click="runMonthAction('close')" />
          </div>
        </UCard>
      </template>
    </UModal>
  </UContainer>
</template>
