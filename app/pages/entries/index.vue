<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "Entries · Tricker" });

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const toast = useToast();

const { data: roomRes } = await useFetch("/api/rooms/current");
const roomId = computed(() => roomRes.value?.data?.room?.id ?? null);

const { members, categories } = await useRoomLists(roomId);

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
  createdByUserId: string;
}

const entries = ref<EntryRow[]>([]);
const loaded = ref(false);

async function refresh() {
  if (!roomId.value) return;
  const res = await $fetch(`/api/rooms/${roomId.value}/entries`);
  entries.value = (res.data?.entries ?? []) as unknown as EntryRow[];
  loaded.value = true;
}

if (roomId.value) await refresh();
watch(roomId, () => refresh());

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const catName = (id: string | null) =>
  id ? (categories.value.find((c) => c.id === id)?.name ?? "—") : "—";
const memberLabel = (id: string) => memberById.value.get(id)?.displayName ?? "—";

const isAdmin = computed(() =>
  members.value.some((m) => m.userId === user.value?.id && m.role === "admin"),
);
// Delete rule (SPEC §8): published → creator or admin; draft → admin only.
function canDelete(e: EntryRow) {
  if (isAdmin.value) return true;
  if (e.status === "draft") return false;
  return e.createdByUserId === user.value?.id;
}

async function onDelete(e: EntryRow) {
  if (!roomId.value) return;
  if (!confirm("Delete this entry?")) return;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${e.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide:circle-check", title: "Deleted" });
    await refresh();
  } catch (err) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: err instanceof Error ? err.message : "Could not delete.",
    });
  }
}

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
    year: "numeric",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
}

function splitSummary(e: { weights: Array<{ weightBps: number }> }) {
  const active = members.value.length;
  const n = e.weights.length;
  if (n === 0) return "—";
  if (n === active) return "split: all (equal)";
  if (n === 1) return "split: 1 person";
  return e.weights.map((w) => `${(w.weightBps / 100).toFixed(0)}%`).join("/");
}

const columns: TableColumn<EntryRow>[] = [
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
    cell: ({ row }) => formatAmount(row.original.currency, row.original.amountMinor),
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
    header: "Actions",
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
                onDelete(row.original);
              },
            })
          : null,
      ]),
    meta: { class: { td: "text-right", th: "text-right" } },
  },
];

function onRowSelect(_e: Event, row: { original: EntryRow }) {
  navigateTo(`/entries/${row.original.id}/edit`);
}
</script>

<template>
  <UContainer class="py-4 max-w-4xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="font-pixel-circle text-2xl text-primary">Entries</h1>
    </div>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before logging entries."
    />

    <template v-else>
      <div class="flex items-center justify-between gap-3 mb-4">
        <UFormField label="Status" size="sm" class="w-40">
          <USelect v-model="statusFilter" :items="statusItems" value-key="value" />
        </UFormField>
        <span class="text-xs font-semibold uppercase tracking-wide text-toned">
          {{ filtered.length }} entr{{ filtered.length === 1 ? "y" : "ies" }}
        </span>
      </div>

      <UTable
        :data="filtered"
        :columns="columns"
        :loading="!loaded"
        empty="No entries match these filters."
        :ui="{
          tr: 'cursor-pointer hover:bg-elevated/50',
        }"
        @select="onRowSelect"
      />
    </template>
  </UContainer>
</template>
