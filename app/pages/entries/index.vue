<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "Entries · Tricker" });

const { user } = useUserSession();
const roomId = computed(() => user.value?.roomId ?? null);

const { members, categories } = await useRoomLists(roomId);

const {
  data: entriesRes,
  refresh: refreshEntries,
  status: entriesStatus,
} = await useFetch(() => `/api/rooms/${roomId.value}/entries`);

const entries = computed(() => (isSuccessResponse(entriesRes.value) ? entriesRes.value.data : []));
type Entry = (typeof entries.value)[number];

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const catName = (id: string | null) =>
  id ? (categories.value.find((c) => c.id === id)?.name ?? "—") : "—";
const memberLabel = (id: string) => memberById.value.get(id)?.displayName ?? "—";

const isAdmin = computed(() => user.value?.role === "admin");

function canDelete(e: Entry) {
  if (isAdmin.value) return true;
  if (e.status === "draft") return false;
  return e.createdByUserId === user.value?.id;
}

const entryToRemove = ref<Entry | null>(null);

const statusFilter = ref<"all" | "draft" | "published">("all");

const statusItems = [
  { label: "All", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Published", value: "published" },
];

const filtered = computed(() =>
  entries.value
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((e) => (statusFilter.value === "all" ? true : e.status === statusFilter.value)),
);

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
}

function splitSummary(e: Entry) {
  const active = members.value.length;
  const n = e.weights.length;
  if (n === 0) return "—";
  if (n === active) return "split: all (equal)";
  if (n === 1) return "split: 1 person";
  return e.weights.map((w) => `${(w.weightBps / 100).toFixed(0)}%`).join("/");
}

const columns: TableColumn<Entry>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.date),
    meta: { class: { td: "whitespace-nowrap text-toned" } },
  },
  {
    accessorKey: "categoryId",
    header: "Category",
    cell: ({ row }) => catName(row.original.categoryId),
  },
  {
    accessorKey: "notes",
    header: "Description",
    cell: ({ row }) => row.original.notes ?? "—",
    meta: { class: { td: "max-w-[220px] truncate" } },
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) =>
      formatMoney({ amount_minor: row.original.amountMinor, currency: row.original.currency }),
    meta: { class: { td: "text-right tabular-nums whitespace-nowrap", th: "text-right" } },
  },
  {
    accessorKey: "paidByMembershipId",
    header: "Paid by",
    cell: ({ row }) => memberLabel(row.original.paidByMembershipId),
  },
  {
    id: "split",
    header: "Split",
    cell: ({ row }) => splitSummary(row.original),
    meta: { class: { td: "text-toned whitespace-nowrap" } },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "draft"
        ? h(UBadge, { color: "warning", variant: "subtle", size: "xs" }, () => "Draft")
        : h(UBadge, { color: "success", variant: "subtle", size: "xs" }, () => "Published"),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h("div", { class: "flex items-center justify-end gap-1" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          color: "neutral",
          variant: "ghost",
          size: "xs",
          "aria-label": "Edit",
          onClick: (ev: Event) => {
            ev.stopPropagation();
            navigateTo(`/entries/${row.original.id}/edit`);
          },
        }),
        canDelete(row.original)
          ? h(UButton, {
              icon: "i-lucide-trash",
              color: "error",
              variant: "ghost",
              size: "xs",
              "aria-label": "Delete",
              onClick: (ev: Event) => {
                ev.stopPropagation();
                entryToRemove.value = row.original;
              },
            })
          : null,
      ]),
    meta: { class: { td: "text-right whitespace-nowrap", th: "sr-only" } },
  },
];

function onRowSelect(_e: Event, row: { original: Entry }) {
  navigateTo(`/entries/${row.original.id}/edit`);
}
</script>

<template>
  <UContainer class="max-w-4xl py-6 space-y-6">
    <UPageCard
      v-if="!roomId"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before logging entries."
    />

    <template v-else>
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
          <h1 class="font-pixel-circle text-2xl text-primary">Entries</h1>
          <p class="text-xs text-toned">
            {{ filtered.length }} entr{{ filtered.length === 1 ? "y" : "ies" }}
          </p>
        </div>

        <UFormField label="Status" class="w-40">
          <USelect v-model="statusFilter" :items="statusItems" value-key="value" class="w-32" />
        </UFormField>
      </div>

      <UTable
        :data="filtered"
        :columns="columns"
        :loading="entriesStatus === 'pending'"
        :ui="{
          tr: 'cursor-pointer hover:bg-elevated/50',
        }"
        @select="onRowSelect"
      >
        <template #empty>
          <div class="text-center py-10 space-y-2">
            <UIcon name="i-lucide-receipt" class="size-8 text-dimmed mx-auto" />
            <p class="text-sm text-muted">No entries match these filters</p>
            <p class="text-xs text-dimmed">Log a bill or change the status filter.</p>
            <UButton
              icon="i-lucide-plus"
              label="Add entry"
              to="/entries/new"
              color="primary"
              variant="soft"
              class="mt-1"
            />
          </div>
        </template>
      </UTable>

      <EntriesRemoveModal
        :open="entryToRemove !== null"
        :room-id="roomId"
        :entry="entryToRemove"
        @removed="refreshEntries()"
      />
    </template>
  </UContainer>
</template>
