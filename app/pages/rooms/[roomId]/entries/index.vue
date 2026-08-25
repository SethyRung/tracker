<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

useHead({ title: "Entries · Tricker" });

const { roomId } = useScopedRoom();
const { currentRole } = useRoomMemberships();
const isAdmin = computed(() => currentRole.value === "admin");

const { user } = useUserSession();

const { members, categories } = useRoomLists(roomId);

const {
  data: entriesRes,
  refresh: refreshEntries,
  status: entriesStatus,
} = useLazyFetch(() => `/api/rooms/${roomId.value}/entries`);

const entries = computed(() => (isSuccessResponse(entriesRes.value) ? entriesRes.value.data : []));
type Entry = (typeof entries.value)[number];

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const catName = (id: string | null) =>
  id ? (categories.value.find((c) => c.id === id)?.name ?? "—") : "—";
const memberLabel = (id: string) => {
  const m = memberById.value.get(id);
  return m ? (m.nickname ?? m.userName ?? "—") : "—";
};

function isRecurring(e: Entry) {
  if (e.templateId) return true;
  return categories.value.find((c) => c.id === e.categoryId)?.recurringType === "recurring";
}

function canDelete(e: Entry) {
  if (isAdmin.value) return true;
  if (e.status === "draft") return false;
  return e.createdByUserId === user.value?.id;
}

function canEdit(e: Entry) {
  if (isRecurring(e)) return false;
  if (isAdmin.value) return true;
  if (e.status === "draft") return false;
  return e.createdByUserId === user.value?.id;
}

function editRecurring(entry: Entry) {
  const to = entry.categoryId
    ? `/rooms/${roomId.value}/categories?edit=${entry.categoryId}`
    : `/rooms/${roomId.value}/categories`;
  void navigateTo(to);
}

function canPublish(e: Entry) {
  return isAdmin.value && e.status === "draft";
}

const entryToRemove = ref<Entry | null>(null);
const editing = ref<Entry | null>(null);
const formOpen = ref(false);
const publishingId = ref<string | null>(null);
const toast = useToast();
const route = useRoute();

const currentMonth = monthKey();
const blockedCategoryIds = computed(() =>
  Array.from(
    new Set(
      entries.value
        .filter(
          (e) =>
            e.status === "published" && e.categoryId && monthKey(new Date(e.date)) === currentMonth,
        )
        .map((e) => e.categoryId as string),
    ),
  ),
);

function editEntry(entry: Entry) {
  editing.value = entry;
  formOpen.value = true;
}

watch(formOpen, (value) => {
  if (!value) editing.value = null;
});

watch(
  [() => route.query.new, () => route.query.edit, entries],
  () => {
    if (route.query.new != null && route.query.new !== "false") {
      editing.value = null;
      formOpen.value = true;
      void navigateTo({ path: route.path, query: {} }, { replace: true });
      return;
    }
    const editId = route.query.edit;
    if (typeof editId !== "string" || !editId) return;
    const found = entries.value.find((e) => e.id === editId);
    if (!found) return;
    if (isRecurring(found)) {
      void navigateTo(
        found.categoryId
          ? `/rooms/${roomId.value}/categories?edit=${found.categoryId}`
          : `/rooms/${roomId.value}/categories`,
        { replace: true },
      );
      return;
    }
    editEntry(found);
    void navigateTo({ path: route.path, query: {} }, { replace: true });
  },
  { immediate: true },
);

async function onPublish(entry: Entry) {
  if (publishingId.value) return;
  publishingId.value = entry.id;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.id}/publish`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await refreshEntries();
    toast.add({ icon: "i-lucide-circle-check", title: "Published" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not publish.",
    });
  } finally {
    publishingId.value = null;
  }
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
    cell: ({ row }) => toDayJS(row.original.date).format("MMM DD, YYYY"),
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
        canPublish(row.original)
          ? h(UButton, {
              icon: "i-lucide-send",
              color: "warning",
              variant: "ghost",
              size: "xs",
              loading: publishingId.value === row.original.id,
              "aria-label": "Publish",
              onClick: (ev: Event) => {
                ev.stopPropagation();
                void onPublish(row.original);
              },
            })
          : null,
        isRecurring(row.original) && isAdmin.value
          ? h(UButton, {
              icon: "i-lucide-tag",
              color: "neutral",
              variant: "ghost",
              size: "xs",
              "aria-label": "Edit category",
              onClick: (ev: Event) => {
                ev.stopPropagation();
                editRecurring(row.original);
              },
            })
          : canEdit(row.original)
            ? h(UButton, {
                icon: "i-lucide-pencil",
                color: "neutral",
                variant: "ghost",
                size: "xs",
                "aria-label": "Edit",
                onClick: (ev: Event) => {
                  ev.stopPropagation();
                  editEntry(row.original);
                },
              })
            : null,
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
  if (isRecurring(row.original)) {
    if (isAdmin.value) editRecurring(row.original);
    return;
  }
  if (canEdit(row.original)) editEntry(row.original);
}
</script>

<template>
  <UContainer class="max-w-4xl py-6 space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
        <h1 class="font-pixel-circle text-2xl text-primary">Entries</h1>
        <p class="text-xs text-toned">
          {{ entries.length }} entr{{ entries.length === 1 ? "y" : "ies" }}
        </p>
      </div>

      <EntryForm
        v-model:open="formOpen"
        :room-id="roomId"
        :members="members"
        :categories="categories"
        :blocked-category-ids="blockedCategoryIds"
        :entry="editing"
        @refresh="refreshEntries"
      >
        <UButton icon="i-lucide-plus" label="Add" @click="editing = null" />
      </EntryForm>
    </div>

    <UTable
      :data="entries"
      :columns="columns"
      :loading="entriesStatus === 'pending'"
      :ui="{
        tr: 'cursor-pointer hover:bg-elevated/50',
      }"
      @select="onRowSelect"
    />

    <EntriesRemoveModal
      :open="entryToRemove !== null"
      :room-id="roomId"
      :entry="entryToRemove"
      @removed="refreshEntries()"
    />
  </UContainer>
</template>
