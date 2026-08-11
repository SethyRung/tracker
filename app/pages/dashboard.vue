<script setup lang="ts">
definePageMeta({
  auth: { only: "user" },
});

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

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
  displayName: string;
  nickname: string | null;
  color: string | null;
  role: string;
}

const entries = ref<EntryRow[]>([]);
const members = ref<MemberRow[]>([]);
const categories = ref<Array<{ id: string; name: string }>>([]);

const fetchWithCookies = useRequestFetch();

async function refreshAll() {
  if (!roomId.value) return;
  const [e, m, c] = await Promise.all([
    fetchWithCookies(`/api/rooms/${roomId.value}/entries`),
    fetchWithCookies(`/api/rooms/${roomId.value}/members`),
    fetchWithCookies(`/api/rooms/${roomId.value}/categories`),
  ]);
  entries.value = (e.data?.entries ?? []) as unknown as EntryRow[];
  members.value = m.data?.members ?? [];
  categories.value = c.data?.categories ?? [];
}

if (roomId.value) await refreshAll();
watch(roomId, () => refreshAll());

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const catName = (id: string | null) =>
  id ? (categories.value.find((c) => c.id === id)?.name ?? "—") : "—";
const memberLabel = (id: string) => memberById.value.get(id)?.displayName ?? "—";

const drafts = computed(() => entries.value.filter((e) => e.status === "draft"));
const published = computed(() => entries.value.filter((e) => e.status === "published"));

// Drafts aren't counted in settlement until published (SPEC §8), so the totals
// preview sums published entries only.
const totalsByCurrency = computed(() => {
  const map: Record<string, number> = { USD: 0, KHR: 0 };
  for (const e of published.value) {
    map[e.currency] = (map[e.currency] ?? 0) + e.amountMinor;
  }
  return map;
});

const thisMonthEntries = computed(() => {
  const key = currentMonthKey();
  return entries.value
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((e) => monthKey(new Date(e.date)) === key);
});

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

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(memberId: string) {
  return memberById.value.get(memberId)?.color ?? "#a1a1aa";
}

function splitSummary(e: { weights: Array<{ weightBps: number }> }) {
  const active = members.value.length;
  const n = e.weights.length;
  if (n === 0) return "—";
  if (n === active) return "split: all (equal)";
  if (n === 1) return "split: 1 person";
  return e.weights.map((w) => `${(w.weightBps / 100).toFixed(0)}%`).join("/");
}
</script>

<template>
  <div class="px-4 py-4 max-w-2xl mx-auto">
    <AuthEmailVerificationBanner />

    <div v-if="!roomId" class="text-center py-12">
      <UIcon name="i-lucide-home" class="size-12 text-toned mx-auto mb-3" />
      <h2 class="text-lg font-medium text-default">No room yet</h2>
      <p class="text-sm text-toned mt-1">
        Create or join a household to start tracking shared bills.
      </p>
      <UButton color="primary" to="/onboarding/room" class="mt-4">Create room</UButton>
    </div>

    <template v-else>
      <UCard class="mb-4">
        <template #header>
          <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">
            Balances this month
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

      <div class="flex gap-3 mb-4">
        <UButton icon="i-lucide-plus" label="Log entry" to="/entries/new" class="flex-1" />
      </div>

      <UAlert
        v-if="drafts.length > 0"
        color="warning"
        variant="subtle"
        icon="i-lucide-clipboard-list"
        :title="`${drafts.length} draft${drafts.length === 1 ? '' : 's'} to publish`"
        class="mb-4"
      >
        <div class="space-y-1 mt-2">
          <div
            v-for="d in drafts.slice(0, 3)"
            :key="d.id"
            class="flex items-center justify-between gap-2 text-sm"
          >
            <span class="truncate">
              {{ catName(d.categoryId) }} ·
              <span class="text-toned">{{ d.notes ?? "—" }}</span>
            </span>
            <span class="font-medium tabular-nums">{{
              formatAmount(d.currency, d.amountMinor)
            }}</span>
          </div>
        </div>
      </UAlert>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">This month</h2>
          </div>
        </template>

        <ul v-if="thisMonthEntries.length > 0" class="divide-y divide-default">
          <li v-for="e in thisMonthEntries" :key="e.id" class="py-3 space-y-1">
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

        <p v-else class="text-sm text-toned text-center py-6">
          No activity yet — log your first bill or payment to see balances.
        </p>
      </UCard>
    </template>
  </div>
</template>
