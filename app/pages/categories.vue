<script setup lang="ts">
import * as z from "zod";
import { h } from "vue";
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";

useHead({ title: "Categories · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const toast = useToast();

const { user } = useUserSession();
const roomId = computed(() => user.value?.roomId ?? null);

const { data: membersData } = await useFetch(() => `/api/rooms/${roomId.value}/members`);

const members = computed(() => {
  if (!isSuccessResponse(membersData.value)) return [];
  return membersData.value.data;
});

const isAdmin = computed(() =>
  members.value.some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const { data: categoriesData, refresh: refreshCategories } = await useFetch(
  () => `/api/rooms/${roomId.value}/categories`,
);

const categories = computed(() => {
  if (!isSuccessResponse(categoriesData.value)) return [];
  return categoriesData.value.data.categories ?? [];
});

type Category = (typeof categories.value)[number];

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

const schema = z.object({
  name: z.string("Name is required").min(1, "Name is required"),
  recurringType: z.enum(["unlimited", "once", "recurring"], "Recurring type is required"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({});

const showAddForm = ref(false);
const submitting = ref(false);

function reset() {
  state.name = undefined;
  state.recurringType = undefined;
  showAddForm.value = false;
}

async function addCategory(event: FormSubmitEvent<Schema>) {
  if (!roomId.value || submitting.value) return;

  const { name, recurringType } = event.data;

  submitting.value = true;
  try {
    const maxSort = categories.value.reduce((max, c) => Math.max(max, c.sortOrder), -1);
    const res = await $fetch(`/api/rooms/${roomId.value}/categories`, {
      method: "POST",
      body: {
        name,
        sortOrder: maxSort + 1,
        recurringType,
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    reset();
    await refreshCategories();
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not add category.",
    });
  } finally {
    submitting.value = false;
  }
}

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
            await refreshCategories();
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
    <UPageCard
      v-if="!roomId"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before managing categories."
    />

    <template v-else>
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
          <h1 class="font-pixel-circle text-2xl text-primary">Categories</h1>
          <p class="text-xs text-toned">{{ categories.length }} total</p>
        </div>
        <UButton
          v-if="isAdmin"
          icon="i-lucide-plus"
          label="Add"
          :disabled="showAddForm"
          @click="showAddForm = true"
        />
      </div>

      <UCard v-if="showAddForm" variant="outline">
        <UForm :schema="schema" :state="state" class="space-y-6" @submit="addCategory">
          <UFormField label="Name" name="name">
            <UInput v-model="state.name" size="lg" :ui="{ root: 'w-full' }" />
          </UFormField>

          <UFormField label="Recurring" name="recurringType">
            <USelect
              v-model="state.recurringType"
              :items="recurringTypeItems"
              size="lg"
              :ui="{ root: 'w-full', base: 'w-full', itemDescription: 'text-wrap' }"
            />
          </UFormField>

          <div class="flex gap-2">
            <UButton type="submit" label="Add" :loading="submitting" />
            <UButton label="Cancel" color="neutral" variant="ghost" @click="reset" />
          </div>
        </UForm>
      </UCard>

      <UTable :data="categories" :columns="columns">
        <template #empty>
          <div class="text-center py-10 space-y-2">
            <UIcon name="i-lucide-folder-open" class="size-8 text-dimmed mx-auto" />
            <p class="text-sm text-muted">No categories yet</p>
            <p class="text-xs text-dimmed">Add one to start labeling entries.</p>
            <UButton
              v-if="isAdmin"
              icon="i-lucide-plus"
              label="Add"
              class="mt-1"
              @click="showAddForm = true"
            />
          </div>
        </template>
      </UTable>

      <CategoriesRemoveModal
        :open="categoryToRemove !== null"
        :room-id="roomId"
        :category="categoryToRemove"
        @removed="refreshCategories"
      />
    </template>
  </UContainer>
</template>
