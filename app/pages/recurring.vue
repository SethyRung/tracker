<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  auth: { only: "user" },
});

useHead({ title: "Recurring · Tricker" });

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const toast = useToast();

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

interface MemberRow {
  id: string;
  displayName: string;
  role: string;
  userId: string;
}
interface CategoryRow {
  id: string;
  name: string;
  recurringType: "unlimited" | "once" | "recurring";
}
interface TemplateRow {
  id: string;
  categoryId: string;
  categoryName: string;
  currency: "USD" | "KHR";
  amountMinor: number;
  dayOfMonth: number;
  isActive: boolean;
  paidByMembershipId: string | null;
  memberSnapshot: Array<{ membershipId: string; weightBps: number }>;
}

const { data: members } = await useFetch(() => `/api/rooms/${roomId.value}/members`, {
  transform: (r) => (r?.data?.members ?? []) as MemberRow[],
  default: () => [] as MemberRow[],
});
const { data: categories } = await useFetch(() => `/api/rooms/${roomId.value}/categories`, {
  transform: (r) =>
    (r?.data?.categories ?? []).filter(
      (c: CategoryRow) => c.recurringType === "recurring",
    ) as CategoryRow[],
  default: () => [] as CategoryRow[],
});
const { data: templates, refresh: refreshTemplates } = await useFetch(
  () => `/api/rooms/${roomId.value}/templates`,
  {
    transform: (r) => (r?.data?.templates ?? []) as TemplateRow[],
    default: () => [] as TemplateRow[],
  },
);

const isAdmin = computed(() =>
  (members.value ?? []).some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const memberById = computed(() => new Map((members.value ?? []).map((m) => [m.id, m])));

const templateByCategoryId = computed(
  () => new Map((templates.value ?? []).map((t) => [t.categoryId, t])),
);

const recurringCategories = computed(() => categories.value ?? []);
const missingTemplates = computed(() =>
  recurringCategories.value.filter((c) => !templateByCategoryId.value.has(c.id)),
);

const currencyItems = [
  { label: "USD", value: "USD" },
  { label: "KHR", value: "KHR" },
];

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

const weights = ref<Array<{ membershipId: string; weightBps: number }>>([]);
const suppressRebalance = ref(false);

const memberName = (mid: string) => memberById.value.get(mid)?.displayName ?? "—";

// "Paid by" options — whoever fronts this recurring expense each month.
const payerItems = computed(() =>
  (members.value ?? []).map((m) => ({ label: m.displayName, value: m.id })),
);

// Longest-tenured active member: the fallback the server uses when a
// template has no configured payer.
const defaultPayerId = computed(() => (members.value ?? [])[0]?.id);

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
    suppressRebalance.value = true;
    weights.value = (members.value ?? []).map((m) => ({
      membershipId: m.id,
      weightBps: 0,
    }));
    equalSplit();
    suppressRebalance.value = false;
  },
);

function startCreate(category: CategoryRow) {
  editingTemplateId.value = null;
  showAddForm.value = true;
  formState.categoryId = category.id;
  formState.currency = "USD";
  formState.amountMajor = 0;
  formState.dayOfMonth = 1;
  formState.isActive = true;
  formState.paidByMembershipId = defaultPayerId.value;
}

function startEdit(template: TemplateRow) {
  editingTemplateId.value = template.id;
  showAddForm.value = true;
  formState.categoryId = template.categoryId;
  formState.currency = template.currency;
  formState.amountMajor =
    template.currency === "USD" ? template.amountMinor / 100 : template.amountMinor;
  formState.dayOfMonth = template.dayOfMonth;
  formState.isActive = template.isActive;
  formState.paidByMembershipId = template.paidByMembershipId ?? defaultPayerId.value;
  suppressRebalance.value = true;
  weights.value = template.memberSnapshot.map((w) => ({
    membershipId: w.membershipId,
    weightBps: w.weightBps,
  }));
  suppressRebalance.value = false;
}

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
      icon: "i-lucide:circle-x",
      title: "Shares must total 100.00%",
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
      icon: "i-lucide:circle-check",
      title: editingTemplateId.value ? "Saved" : "Created",
    });
    cancel();
    await refreshTemplates();
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not save template.",
    });
  } finally {
    submitting.value = false;
  }
}

async function deleteTemplate(template: TemplateRow) {
  if (!roomId.value) return;
  if (
    !confirm(
      `Delete the recurring template for ${template.categoryName}? Entries already posted are kept but won't be re-created next month.`,
    )
  ) {
    return;
  }
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/templates/${template.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide:circle-check", title: "Deleted" });
    await refreshTemplates();
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not delete template.",
    });
  }
}

const totalWeight = computed(() => weights.value.reduce((s, w) => s + w.weightBps, 0));
const totalWeightPct = computed(() => totalWeight.value / 100);
const attendeeError = computed(() =>
  Math.abs(totalWeightPct.value - 100) > 0.01
    ? `Shares must total 100.00% (currently ${totalWeightPct.value.toFixed(2)}%)`
    : undefined,
);

const editingCategoryName = computed(() => {
  if (!formState.categoryId) return null;
  return recurringCategories.value.find((c) => c.id === formState.categoryId)?.name ?? null;
});

function formatAmount(currency: string, amountMinor: number) {
  if (currency === "USD") {
    return `$${(amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `៛${amountMinor.toLocaleString("en-US")}`;
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="font-pixel-circle text-2xl text-primary">Recurring</h1>
        <p class="text-xs text-toned mt-1">
          Auto-post one entry per month for every recurring category.
        </p>
      </div>
    </div>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before managing recurring templates."
    />

    <template v-else>
      <UAlert
        v-if="recurringCategories.length === 0"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="No recurring categories"
        description="Mark a category as 'Monthly recurring' on the Categories page to set up a template."
      />

      <template v-else>
        <ul class="space-y-3">
          <li
            v-for="cat in recurringCategories"
            :key="cat.id"
            class="rounded-lg border border-default p-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <p class="font-medium truncate">{{ cat.name }}</p>
              <template v-if="templateByCategoryId.get(cat.id)">
                <p class="text-xs text-toned">
                  {{
                    formatAmount(
                      templateByCategoryId.get(cat.id)!.currency,
                      templateByCategoryId.get(cat.id)!.amountMinor,
                    )
                  }}
                  · day {{ templateByCategoryId.get(cat.id)!.dayOfMonth }} ·
                  {{ templateByCategoryId.get(cat.id)!.isActive ? "active" : "paused" }}
                  <template v-if="templateByCategoryId.get(cat.id)!.paidByMembershipId">
                    · paid by
                    {{ memberName(templateByCategoryId.get(cat.id)!.paidByMembershipId!) }}
                  </template>
                </p>
              </template>
              <p v-else class="text-xs text-toned">No template yet</p>
            </div>

            <div v-if="isAdmin" class="flex items-center gap-1">
              <UButton
                v-if="templateByCategoryId.get(cat.id)"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Edit"
                @click="startEdit(templateByCategoryId.get(cat.id)!)"
              />
              <UButton
                v-else
                icon="i-lucide-plus"
                size="sm"
                :disabled="showAddForm"
                @click="startCreate(cat)"
              />
              <UButton
                v-if="templateByCategoryId.get(cat.id)"
                icon="i-lucide-trash"
                color="error"
                variant="ghost"
                size="sm"
                aria-label="Delete"
                @click="deleteTemplate(templateByCategoryId.get(cat.id)!)"
              />
            </div>
          </li>
        </ul>

        <UCard v-if="showAddForm" class="mt-4">
          <template #header>
            <h3 class="text-sm font-semibold">
              {{ editingTemplateId ? "Edit template" : "New template" }}
              <span v-if="editingCategoryName" class="text-toned">· {{ editingCategoryName }}</span>
            </h3>
          </template>

          <UTheme
            :props="{
              inputNumber: {
                size: 'lg',
                ui: {
                  root: 'w-full',
                },
              },
              select: {
                size: 'lg',
                ui: {
                  base: 'w-full',
                },
              },
            }"
          >
            <UForm :schema="schema" :state="formState" class="space-y-6" @submit="saveTemplate">
              <UFormField label="Category" name="categoryId" required>
                <USelect
                  v-model="formState.categoryId"
                  :items="recurringCategories.map((c) => ({ label: c.name, value: c.id }))"
                  value-key="value"
                  :disabled="!!editingTemplateId"
                />
              </UFormField>

              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Amount" name="amountMajor" required>
                  <UInputNumber v-model="formState.amountMajor" :min="0" />
                </UFormField>
                <UFormField label="Currency" name="currency">
                  <USelect v-model="formState.currency" :items="currencyItems" value-key="value" />
                </UFormField>
              </div>

              <UFormField label="Paid by" name="paidByMembershipId" required>
                <USelect
                  v-model="formState.paidByMembershipId"
                  :items="payerItems"
                  class="w-full"
                />
                <template #help>Who fronts this expense each month.</template>
              </UFormField>

              <UFormField label="Day of month" name="dayOfMonth">
                <UInputNumber v-model="formState.dayOfMonth" :min="1" :max="31" />
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
          </UTheme>
        </UCard>
      </template>
    </template>
  </UContainer>
</template>
