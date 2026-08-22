<script setup lang="ts">
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";

useHead({ title: "Categories · Tricker" });

const { user } = useUserSession();
const { roomId } = useScopedRoom();

const typeMeta = {
  unlimited: { label: "Unlimited", color: "neutral" },
  once: { label: "Once", color: "info" },
  recurring: { label: "Recurring", color: "primary" },
} as const;

const membersFetch = useFetch(() => `/api/rooms/${roomId.value}/members`);
const categoriesFetch = useFetch(() => `/api/rooms/${roomId.value}/categories`);
const [{ data: membersData }, { data: categoriesData, refresh }] = await Promise.all([
  membersFetch,
  categoriesFetch,
]);

const members = computed(() =>
  isSuccessResponse(membersData.value) ? membersData.value.data : [],
);

const isAdmin = computed(() =>
  members.value.some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const categories = computed(() =>
  isSuccessResponse(categoriesData.value) ? categoriesData.value.data : [],
);

type Category = (typeof categories.value)[number];

const categoryToRemove = ref<Category | null>(null);
const editing = ref<Category | null>(null);
const formOpen = ref(false);

function editCategory(category: Category) {
  editing.value = category;
  formOpen.value = true;
}

function templateAmount(template: NonNullable<Category["template"]>) {
  return formatMoney({ amount_minor: template.amountMinor, currency: template.currency });
}

watch(formOpen, (value) => {
  if (!value) editing.value = null;
});

const route = useRoute();

watch(
  [() => route.query.edit, categories],
  () => {
    const editId = route.query.edit;
    if (typeof editId !== "string" || !editId) return;
    if (!isAdmin.value) {
      void navigateTo({ path: route.path, query: {} }, { replace: true });
      return;
    }
    const found = categories.value.find((c) => c.id === editId);
    if (!found) return;
    editCategory(found);
    void navigateTo({ path: route.path, query: {} }, { replace: true });
  },
  { immediate: true },
);

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

const columns: TableColumn<Category>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    id: "recurringType",
    header: "Type",
    cell: ({ row }) => {
      const meta = typeMeta[row.original.recurringType];
      return h(UBadge, { label: meta.label, color: meta.color, variant: "subtle" });
    },
  },
  {
    id: "details",
    header: "Schedule",
    cell: ({ row }) => {
      const template = row.original.template;
      if (row.original.recurringType !== "recurring" || !template) {
        return h("span", { class: "text-dimmed" }, "—");
      }

      return h("div", { class: "flex items-center gap-2" }, [
        h("span", { class: "tabular-nums font-medium text-default" }, templateAmount(template)),
        h(UBadge, {
          color: "neutral",
          variant: "subtle",
          icon: "i-lucide-calendar-days",
          label: `Every ${dayOrdinal(template.dayOfMonth)}`,
        }),
        template.isActive
          ? null
          : h(UBadge, {
              color: "warning",
              variant: "subtle",
              icon: "i-lucide-circle-pause",
              label: "Paused",
            }),
      ]);
    },
    meta: { class: { td: "whitespace-nowrap" } },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      isAdmin.value
        ? h("div", { class: "flex items-center justify-end gap-1" }, [
            h(UButton, {
              icon: "i-lucide-pencil",
              color: "neutral",
              variant: "ghost",
              "aria-label": "Edit category",
              onClick: () => editCategory(row.original),
            }),
            h(UButton, {
              icon: "i-lucide-trash",
              color: "error",
              variant: "ghost",
              "aria-label": "Remove category",
              onClick: () => {
                categoryToRemove.value = row.original;
              },
            }),
          ])
        : null,
    meta: { class: { td: "text-right whitespace-nowrap", th: "sr-only w-10" } },
  },
];
</script>

<template>
  <UContainer class="max-w-3xl py-6 space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
        <h1 class="font-pixel-circle text-2xl text-primary">Categories</h1>
        <p class="text-xs text-toned">{{ categories.length }} total</p>
      </div>

      <ClientOnly>
        <CategoryForm
          v-if="isAdmin"
          v-model:open="formOpen"
          :room-id="roomId"
          :members="members"
          :category="editing"
          @refresh="refresh"
        >
          <UButton icon="i-lucide-plus" label="Add" @click="editing = null" />
        </CategoryForm>
      </ClientOnly>
    </div>

    <UTable :data="categories" :columns="columns" />

    <CategoriesRemoveModal
      :open="categoryToRemove !== null"
      :room-id="roomId"
      :category="categoryToRemove"
      @removed="refresh"
    />
  </UContainer>
</template>
