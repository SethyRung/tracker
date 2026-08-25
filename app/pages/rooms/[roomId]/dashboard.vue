<script lang="ts">
interface DashboardMember {
  id: string;
  userId: string;
  role: "admin" | "member";
  nickname: string | null;
  userName: string;
  color?: string | null;
}

interface DashboardEntry {
  id: string;
  status: "draft" | "published";
  currency: "USD" | "KHR";
  amountMinor: number;
  paidByMembershipId: string;
  date: string;
  notes?: string | null;
  categoryId?: string | null;
}
</script>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

useHead({ title: "Dashboard · Tricker" });

const { roomId } = useScopedRoom();

const { user } = useUserSession();

const currentMonth = computed(() => monthKey());

const { data, status: dashStatus } = useAuthAsyncData(
  "room-dashboard",
  async (requestFetch) => {
    const [dashRes, snapRes] = await Promise.all([
      requestFetch(`/api/rooms/${roomId.value}/dashboard`, {
        query: { month: currentMonth.value },
      }),
      requestFetch(`/api/rooms/${roomId.value}/months/${currentMonth.value}`),
    ]);
    return {
      entries: dashRes?.data?.entries ?? [],
      members: dashRes?.data?.members ?? [],
      categories: dashRes?.data?.categories ?? [],
      snapshot: snapRes?.data ?? null,
    };
  },
  { lazy: true },
);

const members = computed<DashboardMember[]>(() => data.value?.members ?? []);
const entries = computed<DashboardEntry[]>(() => data.value?.entries ?? []);

const monthLabel = computed(() => toDayJS(currentMonth.value, "YYYY-MM").format("MMMM YYYY"));
const monthStatus = computed(() => (data.value?.snapshot?.status ?? "open") as "open" | "closed");
const monthClosed = computed(() => monthStatus.value === "closed");

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const published = computed(() => entries.value.filter((e) => e.status === "published"));
const drafts = computed(() => entries.value.filter((e) => e.status === "draft"));
const draftsLabel = computed(
  () => `${drafts.value.length} draft${drafts.value.length > 1 ? "s" : ""} to publish`,
);
const recentEntries = computed(() =>
  entries.value.slice().sort((a, b) => b.date.localeCompare(a.date)),
);

const isAdmin = computed(() =>
  members.value.some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const totals = computed(() => {
  const t: Record<string, number> = { USD: 0, KHR: 0 };
  for (const e of published.value) t[e.currency] = (t[e.currency] ?? 0) + e.amountMinor;
  return t;
});

const paidByMember = computed(() => {
  const map = new Map<string, { USD: number; KHR: number }>();
  for (const e of published.value) {
    const cur = e.currency as "USD" | "KHR";
    const t = map.get(e.paidByMembershipId) ?? { USD: 0, KHR: 0 };
    t[cur] += e.amountMinor;
    map.set(e.paidByMembershipId, t);
  }
  return [...map.entries()]
    .map(([id, t]) => ({ id, ...t }))
    .sort((a, b) => b.USD - a.USD || b.KHR - a.KHR);
});

function money(amountMinor: number, currency: string) {
  return formatMoney({ amount_minor: amountMinor, currency: currency as "USD" | "KHR" });
}
function member(id: string) {
  return memberById.value.get(id);
}
function memberLabel(id: string) {
  const m = member(id);
  return m ? (m.nickname ?? m.userName ?? "—") : "—";
}
function memberInitials(id: string) {
  const m = member(id);
  const name = m ? (m.nickname ?? m.userName ?? "?") : "?";
  return name.slice(0, 1).toUpperCase();
}

const UAvatar = resolveComponent("UAvatar");

const recentColumns: TableColumn<(typeof recentEntries.value)[number]>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => toDayJS(row.original.date).format("MMM DD, YYYY"),
    meta: { class: { td: "whitespace-nowrap" } },
  },
  {
    accessorKey: "notes",
    header: "Description",
  },
  {
    id: "paidBy",
    header: "Paid by",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(UAvatar, {
          text: memberInitials(row.original.paidByMembershipId),
        }),
        memberLabel(row.original.paidByMembershipId),
      ]),
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-sm font-semibold text-primary tabular-nums" },
        money(row.original.amountMinor, row.original.currency),
      ),
    meta: { class: { td: "text-right tabular-nums whitespace-nowrap", th: "text-right" } },
  },
];

function onRowSelect(_e: Event, row: { original: { id: string } }) {
  navigateTo(`/rooms/${roomId.value}/entries?edit=${row.original.id}`);
}
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <AuthEmailVerificationBanner />

    <header class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Overview</p>
        <h1 class="font-pixel-circle text-2xl text-primary">{{ monthLabel }}</h1>
      </div>
      <UBadge
        :color="monthClosed ? 'neutral' : 'success'"
        :variant="monthClosed ? 'subtle' : 'soft'"
        :icon="monthClosed ? 'i-lucide-lock' : 'i-lucide-circle-dot'"
        :label="monthClosed ? 'Closed' : 'Open'"
      />
    </header>

    <div v-if="dashStatus === 'pending'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <USkeleton v-for="i in 2" :key="i" class="h-24 rounded-xl" />
      </div>
      <USkeleton class="h-40 rounded-xl" />
      <USkeleton class="h-64 rounded-xl" />
    </div>

    <div v-else class="space-y-6">
      <UAlert
        v-if="isAdmin && drafts.length > 0 && !monthClosed"
        color="warning"
        variant="subtle"
        icon="i-lucide-file-pen-line"
        :title="draftsLabel"
        description="Review and publish pending drafts so they count toward this month."
        :actions="[
          {
            label: 'Review drafts',
            to: `/rooms/${roomId}/entries`,
            color: 'warning',
            variant: 'solid',
          },
        ]"
      />

      <div class="grid grid-cols-2 gap-4">
        <UCard variant="outline" :ui="{ body: 'p-5 space-y-2' }">
          <div class="flex items-center justify-between">
            <UBadge color="neutral" variant="subtle" label="USD" class="font-mono" />
            <UIcon name="i-lucide-dollar-sign" class="size-4 text-toned" />
          </div>
          <p class="text-2xl font-semibold text-primary tabular-nums">
            {{ money(totals.USD ?? 0, "USD") }}
          </p>
          <p class="text-xs text-dimmed">{{ published.length }} published entries</p>
        </UCard>

        <UCard variant="outline" :ui="{ body: 'p-5 space-y-2' }">
          <div class="flex items-center justify-between">
            <UBadge color="neutral" variant="subtle" label="KHR" class="font-mono" />
            <UIcon name="i-lucide-coins" class="size-4 text-toned" />
          </div>
          <p class="text-2xl font-semibold text-primary tabular-nums">
            {{ money(totals.KHR ?? 0, "KHR") }}
          </p>
          <p class="text-xs text-dimmed">Settled in parallel ledger</p>
        </UCard>
      </div>

      <UButton
        block
        color="neutral"
        variant="outline"
        icon="i-lucide-scale"
        trailing-icon="i-lucide-arrow-right"
        :label="`Settle ${monthLabel}`"
        :to="`/rooms/${roomId}/settle/${currentMonth}`"
      />

      <UCard v-if="paidByMember.length > 0" variant="outline">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-mono text-xs font-semibold uppercase tracking-wider text-toned">
              Paid this month
            </h2>
            <UIcon name="i-lucide-users" class="size-4 text-toned" />
          </div>
        </template>

        <ul class="divide-y divide-default -my-2">
          <li v-for="m in paidByMember" :key="m.id" class="flex items-center gap-3 py-2.5">
            <span
              class="size-2.5 rounded-full shrink-0"
              :style="{ background: member(m.id)?.color ?? '#9CA3AF' }"
            />
            <span class="flex-1 text-sm text-default truncate">{{ memberLabel(m.id) }}</span>
            <span v-if="m.USD" class="text-sm font-medium text-primary tabular-nums">{{
              money(m.USD, "USD")
            }}</span>
            <span v-if="m.KHR" class="text-sm font-medium text-primary tabular-nums">{{
              money(m.KHR, "KHR")
            }}</span>
          </li>
        </ul>
      </UCard>

      <UCard variant="outline" :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-mono text-xs font-semibold uppercase tracking-wider text-toned">
              Recent
            </h2>
            <UButton
              label="See all"
              :to="`/rooms/${roomId}/entries`"
              color="neutral"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            />
          </div>
        </template>

        <UTable
          :data="recentEntries"
          :columns="recentColumns"
          :ui="{
            tr: 'data-[selectable=true]:cursor-pointer',
            td: 'text-toned',
          }"
          @select="onRowSelect"
        />
      </UCard>
    </div>
  </UContainer>
</template>
