<script setup lang="ts">
import * as z from "zod";
import { h } from "vue";
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";

useHead({ title: "Recurring · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const toast = useToast();

const { user } = useUserSession();
const roomId = computed(() => user.value?.roomId ?? null);

const { data: membersRes } = await useFetch(() => `/api/rooms/${roomId.value}/members`);
const { data: categoriesRes } = await useFetch(() => `/api/rooms/${roomId.value}/categories`);
const { data: templatesRes, refresh: refreshTemplates } = await useFetch(
  () => `/api/rooms/${roomId.value}/templates`,
);

const members = computed(() => {
  if (!isSuccessResponse(membersRes.value)) return [];
  return membersRes.value.data;
});

const categories = computed(() => {
  if (!isSuccessResponse(categoriesRes.value)) return [];
  return (categoriesRes.value.data.categories ?? []).filter((c) => c.recurringType === "recurring");
});

const templates = computed(() => {
  if (!isSuccessResponse(templatesRes.value)) return [];
  return templatesRes.value.data ?? [];
});

type Category = (typeof categories.value)[number];
type Template = (typeof templates.value)[number];

const isAdmin = computed(() => user.value?.role === "admin");

const memberById = computed(() => new Map(members.value.map((m) => [m.id, m])));
const templateByCategoryId = computed(() => new Map(templates.value.map((t) => [t.categoryId, t])));

const currencyItems = ["USD", "KHR"];

const schema = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  currency: z.enum(["USD", "KHR"]),
  amountMajor: z.number().positive("Amount must be greater than 0"),
  dayOfMonth: z.number().int().min(1).max(31),
  isActive: z.boolean(),
  paidByMembershipId: z.string().min(1, "Pick who pays"),
});

type Schema = z.output<typeof schema>;

const formState = reactive<Partial<Schema>>({});
const editingTemplateId = ref<string | null>(null);
const showAddForm = ref(false);
const submitting = ref(false);
const templateToRemove = ref<Template | null>(null);

const weights = ref<Array<{ membershipId: string; weightBps: number }>>([]);

const memberName = (mid: string) => memberById.value.get(mid)?.displayName ?? "—";

const defaultPayerId = computed(() => user.value?.id);

function equalSplit() {
  const n = weights.value.length;
  if (n === 0) return;
  const base = Math.floor(10000 / n);
  weights.value.forEach((w) => (w.weightBps = base));
  const remainder = 10000 - base * n;
  if (remainder > 0 && weights.value[0]) weights.value[0].weightBps += remainder;
}

watch(
  () => formState.categoryId,
  () => {
    if (editingTemplateId.value) return;
    if (!formState.categoryId) {
      weights.value = [];
      return;
    }
    weights.value = members.value.map((m) => ({ membershipId: m.id, weightBps: 0 }));
    equalSplit();
  },
);

function cancel() {
  showAddForm.value = false;
  editingTemplateId.value = null;
  formState.categoryId = undefined;
  formState.currency = undefined;
  formState.amountMajor = undefined;
  formState.dayOfMonth = undefined;
  formState.isActive = undefined;
  formState.paidByMembershipId = undefined;
  weights.value = [];
}

async function saveTemplate(event: FormSubmitEvent<Schema>) {
  if (!roomId.value) return;

  const total = weights.value.reduce((s, w) => s + w.weightBps, 0);
  if (Math.abs(total - 10000) > 0.0001) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Shares must total 100%",
      description: `Currently ${(total / 100).toFixed(2)}%`,
    });
    return;
  }

  submitting.value = true;
  try {
    const body = {
      categoryId: event.data.categoryId,
      currency: event.data.currency,
      amountMinor:
        event.data.currency === "USD"
          ? Math.round(event.data.amountMajor * 100)
          : Math.round(event.data.amountMajor),
      dayOfMonth: event.data.dayOfMonth,
      isActive: event.data.isActive,
      paidByMembershipId: event.data.paidByMembershipId,
      memberSnapshot: weights.value,
    };

    const res = editingTemplateId.value
      ? await $fetch(`/api/rooms/${roomId.value}/templates/${editingTemplateId.value}`, {
          method: "PATCH",
          body,
        })
      : await $fetch(`/api/rooms/${roomId.value}/templates`, {
          method: "POST",
          body,
        });

    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    toast.add({
      icon: "i-lucide-circle-check",
      title: editingTemplateId.value ? "Saved" : "Created",
      description: editingTemplateId.value
        ? "Template updated successfully."
        : "Template created successfully.",
    });
    cancel();
    await refreshTemplates();
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not save template.",
    });
  } finally {
    submitting.value = false;
  }
}

const totalWeight = computed(() => weights.value.reduce((s, w) => s + w.weightBps, 0));
const totalWeightPct = computed(() => totalWeight.value / 100);
const attendeeError = computed(() =>
  Math.abs(totalWeightPct.value - 100) > 0.01
    ? `Shares must total 100% (currently ${totalWeightPct.value.toFixed(2)}%)`
    : undefined,
);

const editingCategoryName = computed(() => {
  if (!formState.categoryId) return null;
  return categories.value.find((c) => c.id === formState.categoryId)?.name ?? null;
});

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

const columns: TableColumn<Category>[] = [
  {
    accessorKey: "name",
    header: "Category",
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const t = templateByCategoryId.value.get(row.original.id);

      return h(
        "span",
        { class: !t ? "text-dimmed" : "font-semibold text-primary" },
        !t ? "—" : formatMoney({ amount_minor: t.amountMinor, currency: t.currency }),
      );
    },
    meta: { class: { td: "text-right tabular-nums whitespace-nowrap" } },
  },
  {
    id: "dayOfMonth",
    header: "Day",
    cell: ({ row }) => {
      const t = templateByCategoryId.value.get(row.original.id);

      return h(
        "span",
        { class: !t ? "text-dimmed" : "text-toned" },
        !t ? "—" : String(t.dayOfMonth),
      );
    },
    meta: { class: { td: "text-center whitespace-nowrap" } },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const t = templateByCategoryId.value.get(row.original.id);
      if (!t) return h("span", { class: "text-xs text-dimmed" }, "No template");
      return h(UBadge, {
        label: t.isActive ? "Active" : "Paused",
        color: t.isActive ? "success" : "neutral",
        variant: "soft",
      });
    },
    meta: { class: { td: "whitespace-nowrap" } },
  },
  {
    id: "paidBy",
    header: "Paid by",
    cell: ({ row }) => {
      const t = templateByCategoryId.value.get(row.original.id);
      if (!t || !t.paidByMembershipId) return h("span", { class: "text-dimmed" }, "—");
      return h("span", { class: "text-sm text-toned" }, memberName(t.paidByMembershipId));
    },
    meta: { class: { td: "whitespace-nowrap" } },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      if (!isAdmin.value) return null;
      const t = templateByCategoryId.value.get(row.original.id);
      if (!t) {
        return h(UButton, {
          icon: "i-lucide-plus",
          size: "sm",
          color: "primary",
          variant: "soft",
          label: "Add",
          disabled: showAddForm.value,
          onClick: () => {
            editingTemplateId.value = null;
            showAddForm.value = true;
            formState.categoryId = row.original.id;
            formState.currency = "USD";
            formState.amountMajor = 0;
            formState.dayOfMonth = 1;
            formState.isActive = true;
            formState.paidByMembershipId = defaultPayerId.value;
          },
        });
      }
      return h("div", { class: "flex items-center justify-end gap-1" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          color: "neutral",
          variant: "ghost",
          size: "sm",
          "aria-label": "Edit",
          onClick: () => {
            editingTemplateId.value = t.id;
            showAddForm.value = true;
            formState.categoryId = t.categoryId;
            formState.currency = t.currency;
            formState.amountMajor = t.currency === "USD" ? t.amountMinor / 100 : t.amountMinor;
            formState.dayOfMonth = t.dayOfMonth;
            formState.isActive = t.isActive;
            formState.paidByMembershipId = t.paidByMembershipId ?? defaultPayerId.value;
            weights.value = t.memberSnapshot.map((w) => ({
              membershipId: w.membershipId,
              weightBps: w.weightBps,
            }));
          },
        }),
        h(UButton, {
          icon: "i-lucide-trash",
          color: "error",
          variant: "ghost",
          size: "sm",
          "aria-label": "Delete",
          onClick: () => {
            templateToRemove.value = t;
          },
        }),
      ]);
    },
    meta: { class: { td: "text-right whitespace-nowrap", th: "sr-only" } },
  },
];
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <UPageCard
      v-if="!roomId"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before managing recurring templates."
    />

    <template v-else>
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="font-mono text-xs uppercase tracking-wider text-toned">Automation</p>
          <h1 class="font-pixel-circle text-2xl text-primary">Recurring</h1>
          <p class="text-xs text-toned">
            Auto-post one entry per month for every recurring category ·
            {{ categories.length }} categor{{ categories.length === 1 ? "y" : "ies" }}
          </p>
        </div>
      </div>

      <UCard v-if="showAddForm" variant="outline">
        <template #header>
          <h3 class="text-sm font-semibold">
            {{ editingTemplateId ? "Edit template" : "New template" }}
            <span v-if="editingCategoryName" class="text-toned">· {{ editingCategoryName }}</span>
          </h3>
        </template>

        <UForm :schema="schema" :state="formState" class="space-y-6" @submit="saveTemplate">
          <UFormField label="Category" name="categoryId" required>
            <USelect
              v-model="formState.categoryId"
              :items="categories.map((c) => ({ label: c.name, value: c.id }))"
              value-key="value"
              size="lg"
              class="w-full"
              :disabled="!!editingTemplateId"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Amount" name="amountMajor" required>
              <UInputNumber
                v-model="formState.amountMajor"
                :min="0"
                size="lg"
                :ui="{ root: 'w-full' }"
              />
            </UFormField>
            <UFormField label="Currency" name="currency">
              <USelect
                v-model="formState.currency"
                :items="currencyItems"
                value-key="value"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Paid by" name="paidByMembershipId" required>
            <USelect
              v-model="formState.paidByMembershipId"
              :items="members"
              label-key="displayName"
              value-key="id"
              size="lg"
              class="w-full"
            />
            <template #help>Who fronts this expense each month.</template>
          </UFormField>

          <UFormField label="Day of month" name="dayOfMonth">
            <UInputNumber
              v-model="formState.dayOfMonth"
              :min="1"
              :max="31"
              size="lg"
              :ui="{ root: 'w-full' }"
            />
          </UFormField>

          <UFormField label="Active" name="isActive">
            <USwitch v-model="formState.isActive" />
          </UFormField>

          <UFormField label="Attendees" :error="attendeeError">
            <template #hint>
              <UButton label="Reset to equal" size="xs" variant="soft" @click="equalSplit" />
            </template>

            <ul class="space-y-2">
              <li v-for="w in weights" :key="w.membershipId" class="flex items-center gap-2">
                <span class="flex-1 text-sm truncate">{{ memberName(w.membershipId) }}</span>
                <UInputNumber
                  :model-value="w.weightBps / 100"
                  :min="0"
                  :max="100"
                  orientation="vertical"
                  class="w-24"
                  @update:model-value="
                    (v: number | null) => (w.weightBps = Math.round(Number(v ?? 0) * 100))
                  "
                />
              </li>
            </ul>
            <p class="text-xs text-toned mt-2">Total: {{ totalWeightPct.toFixed(2) }}%</p>
          </UFormField>

          <div class="flex gap-2">
            <UButton type="submit" label="Save" :loading="submitting" />
            <UButton label="Cancel" color="neutral" variant="ghost" @click="cancel" />
          </div>
        </UForm>
      </UCard>

      <UTable
        :data="categories"
        :columns="columns"
        :ui="{
          td: 'text-default',
        }"
      >
        <template #empty>
          <div class="text-center py-10 space-y-2">
            <UIcon name="i-lucide-repeat" class="size-8 text-dimmed mx-auto" />
            <p class="text-sm text-muted">No recurring categories</p>
            <p class="text-xs text-dimmed">
              Mark a category as 'Monthly recurring' on the
              <ULink to="/categories" class="text-primary underline">Categories</ULink> page to set
              up a template.
            </p>
          </div>
        </template>
      </UTable>

      <RecurringRemoveModal
        :open="templateToRemove !== null"
        :room-id="roomId"
        :template="templateToRemove"
        @removed="refreshTemplates"
      />
    </template>
  </UContainer>
</template>
