<script setup lang="ts">
definePageMeta({
  auth: { only: "user" },
});

const { user, signOut } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const { data: roomRes } = await useFetch("/api/rooms/current");
const roomId = computed(() => roomRes.value?.data?.room?.id ?? null);

interface BillRow {
  id: string;
  currency: string;
  amountMinor: number;
  date: string;
  status: string;
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

const bills = ref<BillRow[]>([]);
const members = ref<MemberRow[]>([]);
const categories = ref<Array<{ id: string; name: string }>>([]);

const fetchWithCookies = useRequestFetch();

async function refreshAll() {
  if (!roomId.value) return;
  const [b, m, c] = await Promise.all([
    fetchWithCookies(`/api/rooms/${roomId.value}/bills`),
    fetchWithCookies(`/api/rooms/${roomId.value}/members`),
    fetchWithCookies(`/api/rooms/${roomId.value}/categories`),
  ]);
  bills.value = (b.data?.bills ?? []) as unknown as BillRow[];
  members.value = m.data?.members ?? [];
  categories.value = c.data?.categories ?? [];
}

if (roomId.value) await refreshAll();
watch(roomId, () => refreshAll());

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const catName = (id: string | null) =>
  id ? (categories.value.find((c) => c.id === id)?.name ?? "—") : "—";
const memberLabel = (id: string) => memberById.value.get(id)?.displayName ?? "—";

const drafts = computed(() => bills.value.filter((b) => b.status === "draft"));
const published = computed(() => bills.value.filter((b) => b.status === "published"));
const recent = computed(() =>
  bills.value
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5),
);

const totalsByCurrency = computed(() => {
  const map: Record<string, number> = { USD: 0, KHR: 0 };
  for (const b of bills.value) {
    if (map[b.currency] === undefined) map[b.currency] = 0;
    map[b.currency] = (map[b.currency] ?? 0) + b.amountMinor;
  }
  return map;
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

function splitSummary(b: BillRow) {
  const active = members.value.length;
  const n = b.weights.length;
  if (n === 0) return "—";
  if (n === active) return "split: all (equal)";
  if (n === 1) return "split: 1 person";
  return b.weights.map((w) => `${(w.weightBps / 100).toFixed(0)}%`).join("/");
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
            v-for="b in drafts.slice(0, 3)"
            :key="b.id"
            class="flex items-center justify-between gap-2 text-sm"
          >
            <span class="truncate">
              {{ catName(b.categoryId) }} ·
              <span class="text-toned">{{ b.notes ?? "—" }}</span>
            </span>
            <span class="font-medium tabular-nums">{{
              formatAmount(b.currency, b.amountMinor)
            }}</span>
          </div>
        </div>
        <UButton color="warning" variant="outline" size="sm" to="/dashboard" class="mt-3">
          Review drafts →
        </UButton>
      </UAlert>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-toned">Recent</h2>
            <UButton variant="ghost" color="neutral" size="xs" to="/dashboard">See all</UButton>
          </div>
        </template>

        <ul v-if="recent.length > 0" class="divide-y divide-default">
          <li v-for="b in recent" :key="b.id" class="py-3 space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs text-toned">{{ formatDate(b.date) }}</span>
              <span class="text-sm font-medium text-default">· {{ catName(b.categoryId) }}</span>
            </div>
            <NuxtLink :to="`/bills/${b.id}/edit`" class="text-sm text-default hover:text-primary">
              {{ b.notes ?? "—" }}
            </NuxtLink>
            <div class="flex items-center justify-between text-xs text-toned">
              <span>
                {{ formatAmount(b.currency, b.amountMinor) }}
                paid by {{ memberLabel(b.paidByMembershipId) }}
              </span>
              <span>{{ splitSummary(b) }}</span>
            </div>
          </li>
        </ul>

        <p v-else class="text-sm text-toned text-center py-6">
          No activity yet — log your first bill to see balances.
        </p>
      </UCard>
    </template>
  </div>
</template>
