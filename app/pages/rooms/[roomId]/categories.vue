<script setup lang="ts">
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";

useHead({ title: "Categories · Tricker" });

const { user } = useUserSession();
const { roomId } = useScopedRoom();

const toast = useToast();

const recurringTypeItems = [
  {
    label: "Unlimited",
    value: "unlimited",
    description: "Log as many entries as you want in a month.",
  },
  {
    label: "Once a month",
    value: "once",
    description: "One entry per month — a second is blocked; edit the existing one.",
  },
  {
    label: "Monthly recurring",
    value: "recurring",
    description:
      "Auto-post each month with a default amount; edit any time while the month is open.",
  },
];

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

const UButton = resolveComponent("UButton");
const USelect = resolveComponent("USelect");

const columns: TableColumn<Category>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    id: "recurringType",
    header: "Recurring",
    cell: ({ row }) =>
      h(USelect, {
        modelValue: row.original.recurringType,
        items: recurringTypeItems,
        class: "w-48",
        disabled: !isAdmin.value,
        "onUpdate:modelValue": async (v: Category["recurringType"]) => {
          const cat = row.original;

          if (!roomId.value || cat.recurringType === v) return;

          try {
            const res = await $fetch(`/api/rooms/${roomId.value}/categories/${cat.id}`, {
              method: "PATCH",
              body: { recurringType: v },
            });
            if (!isSuccessResponse(res)) throw new Error(res.status.message);
            await refresh();
          } catch (e) {
            toast.add({
              icon: "i-lucide-circle-x",
              title: "Error",
              description: e instanceof Error ? e.message : "Could not update category.",
            });
          }
        },
        ui: {
          itemDescription: "text-wrap",
        },
      }),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      isAdmin.value
        ? h(UButton, {
            icon: "i-lucide-trash",
            color: "error",
            variant: "ghost",
            "aria-label": "Remove category",
            onClick: () => {
              categoryToRemove.value = row.original;
            },
          })
        : null,
    meta: { class: { td: "text-right", th: "sr-only w-10" } },
  },
];
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
        <h1 class="font-pixel-circle text-2xl text-primary">Categories</h1>
        <p class="text-xs text-toned">{{ categories.length }} total</p>
      </div>

      <CategoryForm v-if="isAdmin" :room-id="roomId" :members="members" @refresh="refresh">
        <UButton icon="i-lucide-plus" label="Add" />
      </CategoryForm>
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
