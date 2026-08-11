<script setup lang="ts">
useHead({ title: "Month · Tricker" });
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

interface MonthSnapshot {
  status: "open" | "closed";
  closedAt: string | null;
  closedByUserId: string | null;
}

interface EntryRow {
  id: string;
  currency: string;
  amountMinor: number;
  date: string;
  status: "draft" | "published";
  notes: string | null;
  categoryId: string | null;
  paidByMembershipId: string;
  weights: Array<{ membershipId: string; weightBps: number }>;
}

interface MemberRow {
  id: string;
  userId: string;
  displayName: string;
  color: string | null;
  role: string;
}

interface CategoryRow {
  id: string;
  name: string;
}

const { data: entries } = await useFetch(() => `/api/rooms/${roomId.value}/entries`, {
  query: { month: yyyymm },
  transform: (r) => (r?.data?.entries ?? []) as EntryRow[],
  default: () => [] as EntryRow[],
});
const { data: members } = await useFetch(() => `/api/rooms/${roomId.value}/members`, {
  transform: (r) => (r?.data?.members ?? []) as MemberRow[],
  default: () => [] as MemberRow[],
});
const { data: categories } = await useFetch(() => `/api/rooms/${roomId.value}/categories`, {
  transform: (r) => (r?.data?.categories ?? []) as CategoryRow[],
  default: () => [] as CategoryRow[],
});
const { data: monthSnapshot, refresh: refreshMonth } = await useFetch(
  () => `/api/rooms/${roomId.value}/months/${yyyymm.value}`,
  {
    transform: (r) => (r?.data?.snapshot ?? null) as MonthSnapshot | null,
    default: () => null as MonthSnapshot | null,
  },
);

const closingMonth = ref(false);

const isAdmin = computed(() =>
  (members.value ?? []).some((m) => m.userId === user.value?.id && m.role === "admin"),
);
const monthClosed = computed(() => monthSnapshot.value?.status === "closed");

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

const memberById = computed(() => new Map((members.value ?? []).map((m) => [m.id, m])));
const catName = (id: string | null) =>
  id ? ((categories.value ?? []).find((c) => c.id === id)?.name ?? "—") : "—";
const memberLabel = (id: string) => memberById.value.get(id)?.displayName ?? "—";

const drafts = computed(() => (entries.value ?? []).filter((e) => e.status === "draft"));
const published = computed(() => (entries.value ?? []).filter((e) => e.status === "published"));

const totalsByCurrency = computed(() => {
  const map: Record<string, number> = { USD: 0, KHR: 0 };
  for (const e of published.value) {
    map[e.currency] = (map[e.currency] ?? 0) + e.amountMinor;
  }
  return map;
});

const sortedEntries = computed(() =>
  (entries.value ?? []).slice().sort((a, b) => b.date.localeCompare(a.date)),
);

function formatAmount(currency: string, amountMinor: number) {
  if (currency === "USD") {
    return `$${(amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `៛${amountMinor.toLocaleString("en-US")}`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
}

function splitSummary(e: { weights: Array<{ weightBps: number }> }) {
  const active = (members.value ?? []).length;
  const n = e.weights.length;
  if (n === 0) return "—";
  if (n === active) return "split: all (equal)";
  if (n === 1) return "split: 1 person";
  return e.weights.map((w) => `${(w.weightBps / 100).toFixed(0)}%`).join("/");
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
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
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-scale"
          label="Settle"
          color="neutral"
          variant="outline"
          :to="`/settle/${yyyymm}`"
        />
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
    </div>

    <UAlert
      v-if="monthClosed"
      color="warning"
      variant="subtle"
      icon="i-lucide-lock"
      title="Month closed"
      description="No edits, deletes, or publishes until an admin reopens this month."
      class="mb-4"
    />

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before viewing history."
    />

    <template v-else>
      <UCard class="mb-4">
        <template #header>
          <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">
            Totals this month
          </h2>
        </template>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg bg-elevated p-3">
            <p class="text-xs font-semibold text-toned mb-2">USD</p>
            <p class="text-lg font-bold text-default tabular-nums">
              {{ formatAmount("USD", totalsByCurrency.USD ?? 0) }}
            </p>
          </div>
          <div class="rounded-lg bg-elevated p-3">
            <p class="text-xs font-semibold text-toned mb-2">KHR</p>
            <p class="text-lg font-bold text-default tabular-nums">
              {{ formatAmount("KHR", totalsByCurrency.KHR ?? 0) }}
            </p>
          </div>
        </div>
      </UCard>

      <UAlert
        v-if="drafts.length > 0"
        color="warning"
        variant="subtle"
        icon="i-lucide-clipboard-list"
        :title="`${drafts.length} draft${drafts.length === 1 ? '' : 's'} to publish`"
        class="mb-4"
      />

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">
              Entries ({{ sortedEntries.length }})
            </h2>
          </div>
        </template>

        <ul v-if="sortedEntries.length > 0" class="divide-y divide-default">
          <li v-for="e in sortedEntries" :key="e.id" class="py-3 space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs text-toned">{{ formatDate(e.date) }}</span>
              <span class="text-sm font-medium text-default">· {{ catName(e.categoryId) }}</span>
              <UBadge v-if="e.status === 'draft'" color="warning" variant="subtle" size="xs">
                Draft
              </UBadge>
            </div>
            <NuxtLink :to="`/entries/${e.id}/edit`" class="text-sm text-default hover:text-primary">
              {{ e.notes ?? "—" }}
            </NuxtLink>
            <div class="flex items-center justify-between text-xs text-toned">
              <span>
                {{ formatAmount(e.currency, e.amountMinor) }}
                paid by {{ memberLabel(e.paidByMembershipId) }}
              </span>
              <span>{{ splitSummary(e) }}</span>
            </div>
          </li>
        </ul>

        <p v-else class="text-sm text-toned text-center py-6">No entries this month.</p>
      </UCard>
    </template>
  </UContainer>
</template>
