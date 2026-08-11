<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";

const USelect = resolveComponent("USelect");
const UButton = resolveComponent("UButton");

definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "Categories · Tricker" });

const { loggedIn, fetchSession } = useUserSession();
if (!loggedIn.value) await fetchSession({ force: true });

const toast = useToast();

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

type RecurringType = "unlimited" | "once" | "recurring";
interface CategoryRow {
  id: string;
  name: string;
  sortOrder: number;
  recurringType: RecurringType;
}

const { data: categories, refresh: refreshCategories } = await useFetch(
  () => `/api/rooms/${roomId.value}/categories`,
  {
    transform: (res) => (res?.data?.categories ?? []) as CategoryRow[],
    default: () => [] as CategoryRow[],
  },
);

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
    description: "Auto-draft each month with a default amount; edit before publishing.",
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
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not add category.",
    });
  } finally {
    submitting.value = false;
  }
}

async function updateRecurringType(cat: CategoryRow, type: RecurringType) {
  if (!roomId.value || cat.recurringType === type) return;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/categories/${cat.id}`, {
      method: "PATCH",
      body: { recurringType: type },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await refreshCategories();
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not update category.",
    });
    await refreshCategories();
  }
}

async function deleteCategory(id: string) {
  if (!roomId.value) return;
  if (!confirm("Delete this category? This cannot be undone.")) return;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/categories/${id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await refreshCategories();
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not delete category.",
    });
  }
}

const columns: TableColumn<CategoryRow>[] = [
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
        "onUpdate:modelValue": (v: RecurringType) => updateRecurringType(row.original, v),
      }),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h("div", { class: "flex justify-end" }, [
        h(UButton, {
          icon: "i-lucide-trash",
          color: "error",
          variant: "ghost",
          "aria-label": "Delete",
          onClick: () => deleteCategory(row.original.id),
        }),
      ]),
    meta: { class: { td: "text-right", th: "w-10" } },
  },
];
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="font-pixel-circle text-2xl text-primary">Categories</h1>
        <p class="text-xs text-toned mt-1">{{ categories.length }} total</p>
      </div>

      <UButton
        icon="i-lucide-plus"
        label="Add"
        :disabled="showAddForm || !roomId"
        @click="showAddForm = true"
      />
    </div>

    <UCard v-if="showAddForm" class="mb-4">
      <UForm :schema="schema" :state="state" class="space-y-6" @submit="addCategory">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" size="lg" :ui="{ root: 'w-full' }" />
        </UFormField>

        <UFormField label="Recurring" name="recurringType">
          <USelect
            v-model="state.recurringType"
            :items="recurringTypeItems"
            size="lg"
            :ui="{ root: 'w-full', base: 'w-full' }"
          />
        </UFormField>

        <div class="flex gap-2">
          <UButton type="submit" label="Add" :loading="submitting" />

          <UButton label="Cancel" color="neutral" variant="ghost" @click="reset" />
        </div>
      </UForm>
    </UCard>

    <div v-if="!roomId" class="text-sm text-toned text-center py-8">No room yet.</div>

    <UTable
      v-else
      :data="categories"
      :columns="columns"
      empty='No categories yet. Click "Add" to create one.'
    />
  </UContainer>
</template>
