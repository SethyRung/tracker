<script setup lang="ts">
import { parseDate } from "@internationalized/date";
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";
import { z } from "zod";

const UAvatar = resolveComponent("UAvatar");
const UIcon = resolveComponent("UIcon");
const UInputNumber = resolveComponent("UInputNumber");

definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "Edit Bill · Tricker" });

const route = useRoute();
const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const billId = computed(() => route.params.id as string);
const { data: roomRes } = await useFetch("/api/rooms/current");
const roomId = computed(() => roomRes.value?.data?.room?.id ?? null);

const { members, categories } = await useRoomLists(roomId);

const formSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
  amountMajor: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "KHR"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  categoryId: z.string().min(1, "Category is required"),
  paidByMembershipId: z.string().min(1, "Paid by is required"),
  attendees: z.array(z.string()).min(1, "At least one attendee is required"),
});

type FormState = z.infer<typeof formSchema>;

const state = reactive<FormState>({
  description: "",
  amountMajor: 0,
  currency: "USD",
  date: "",
  categoryId: "",
  paidByMembershipId: "",
  attendees: [],
});

const dateValue = computed({
  get: () => (state.date ? parseDate(state.date) : undefined),
  set: (v) => {
    if (!v) state.date = "";
    else state.date = `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
  },
});

const memberCheckboxItems = computed(() =>
  members.value.map((m) => ({ label: m.displayName, value: m.id })),
);

const bill = ref<{
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  notes: string | null;
  categoryId: string | null;
  paidByMembershipId: string;
  weights: Array<{ membershipId: string; weightBps: number }>;
  createdByUserId: string;
} | null>(null);

const weights = ref<Array<{ membershipId: string; weightBps: number }>>([]);
const loaded = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);
const suppressRebalance = ref(false);

const totalWeight = computed(() => weights.value.reduce((s, w) => s + w.weightBps, 0));
const totalWeightPct = computed(() => totalWeight.value / 100);
const attendeeError = computed(() =>
  Math.abs(totalWeightPct.value - 100) > 0.01
    ? `Shares must total 100.00% (currently ${totalWeightPct.value.toFixed(2)}%)`
    : undefined,
);
const isDraft = computed(() => bill.value?.status === "draft");
const isOwner = computed(() => bill.value?.createdByUserId === user.value?.id);
const isAdmin = computed(() =>
  members.value.some((m) => m.userId === user.value?.id && m.role === "admin"),
);
const canEdit = computed(() => isAdmin.value || (isDraft.value && isOwner.value));
const canPublish = computed(() => isAdmin.value && isDraft.value);

function memberName(mid: string) {
  return members.value.find((m) => m.id === mid)?.displayName ?? "—";
}

function rebalance() {
  const n = weights.value.length;
  if (n === 0) return;
  const base = Math.floor(10000 / n);
  weights.value.forEach((w) => (w.weightBps = base));
  const remainder = 10000 - base * n;
  if (remainder > 0 && weights.value[0]) weights.value[0].weightBps += remainder;
}

watch(
  () => state.attendees,
  (next) => {
    weights.value = next.map((mid) => {
      const existing = weights.value.find((w) => w.membershipId === mid);
      return existing ?? { membershipId: mid, weightBps: 0 };
    });
    if (!suppressRebalance.value) rebalance();
  },
);

const columns: TableColumn<(typeof weights.value)[number]>[] = [
  {
    id: "member",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(UAvatar, { alt: memberName(row.original.membershipId) }),
        h(
          "span",
          { class: "text-sm font-medium truncate" },
          memberName(row.original.membershipId),
        ),
      ]),
  },
  {
    id: "share",
    cell: ({ row }) =>
      h(UInputNumber, {
        modelValue: row.original.weightBps / 100,
        min: 0,
        max: 100,
        orientation: "vertical",
        class: "w-full",
        disabled: !canEdit.value,
        "onUpdate:modelValue": (v: number | null) => {
          row.original.weightBps = Math.round(Number(v ?? 0) * 100);
        },
      }),
    footer: ({ column }) => {
      const total =
        column.getFacetedRowModel().rows.reduce((acc, row) => acc + row.original.weightBps, 0) /
        100;
      return h(
        "div",
        {
          class: ["flex items-center gap-2", total !== 100 ? "text-error" : "text-primary"],
        },
        [
          h("span", { class: "text-sm font-medium" }, `Total: ${total}%`),
          h(UIcon, {
            name: total === 100 ? "i-lucide-check-circle" : "i-lucide-triangle-alert",
          }),
        ],
      );
    },
    meta: { class: { td: "w-40" } },
  },
];

const fetchWithCookies = useRequestFetch();

async function loadBill() {
  if (!roomId.value || !billId.value) return;
  const res = await fetchWithCookies(`/api/rooms/${roomId.value}/bills/${billId.value}`);
  const data = res.data?.bill;
  bill.value = data ?? null;
  if (data) {
    suppressRebalance.value = true;
    weights.value = data.weights.map((w) => ({
      membershipId: w.membershipId,
      weightBps: w.weightBps,
    }));
    state.description = data.notes ?? "";
    state.currency = data.currency;
    state.amountMajor =
      data.currency === "USD" ? data.amountMinor / 100 : data.amountMinor;
    state.date = data.date ? new Date(data.date).toISOString().slice(0, 10) : "";
    state.paidByMembershipId = data.paidByMembershipId;
    state.categoryId = data.categoryId ?? "";
    state.attendees = weights.value.map((w) => w.membershipId);
    await nextTick();
    suppressRebalance.value = false;
  }
  loaded.value = true;
}

if (roomId.value && billId.value) await loadBill();
watch([roomId, billId], () => loadBill());

async function onSave(event: FormSubmitEvent<FormState>) {
  if (!roomId.value || !bill.value) return;
  if (attendeeError.value) {
    error.value = attendeeError.value;
    return;
  }
  submitting.value = true;
  error.value = null;
  notice.value = null;
  try {
    await fetchWithCookies(`/api/rooms/${roomId.value}/bills/${bill.value.id}`, {
      method: "PATCH",
      body: {
        categoryId: event.data.categoryId || null,
        amountMinor:
          event.data.currency === "USD"
            ? Math.round(event.data.amountMajor * 100)
            : Math.round(event.data.amountMajor),
        date: event.data.date,
        paidByMembershipId: event.data.paidByMembershipId,
        notes: event.data.description || null,
        weights: weights.value,
      },
    });
    notice.value = "Saved.";
    await loadBill();
  } catch (e) {
    error.value = (e as { statusMessage?: string })?.statusMessage ?? "Could not save.";
  } finally {
    submitting.value = false;
  }
}

async function onPublish() {
  if (!roomId.value || !bill.value) return;
  submitting.value = true;
  error.value = null;
  notice.value = null;
  try {
    await fetchWithCookies(`/api/rooms/${roomId.value}/bills/${bill.value.id}/publish`, {
      method: "POST",
    });
    notice.value = "Published.";
    await loadBill();
  } catch (e) {
    error.value = (e as { statusMessage?: string })?.statusMessage ?? "Could not publish.";
  } finally {
    submitting.value = false;
  }
}

async function onDelete() {
  if (!roomId.value || !bill.value) return;
  if (!confirm("Delete this bill?")) return;
  await fetchWithCookies(`/api/rooms/${roomId.value}/bills/${bill.value.id}`, {
    method: "DELETE",
  });
  await navigateTo("/dashboard");
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <UButton
        icon="i-lucide-chevron-left"
        label="Back"
        color="neutral"
        variant="outline"
        size="sm"
        to="/dashboard"
      />
      <UButton
        v-if="canPublish"
        label="Publish"
        color="primary"
        variant="outline"
        size="sm"
        :loading="submitting"
        :disabled="totalWeight !== 10000 || submitting"
        @click="onPublish"
      />
    </div>

    <div class="flex items-center gap-3 mb-1">
      <h1 class="font-pixel-circle text-2xl text-primary">Bill</h1>
      <UBadge
        v-if="bill?.status === 'published'"
        color="success"
        variant="subtle"
        size="sm"
      >
        Published
      </UBadge>
      <UBadge v-else color="warning" variant="subtle" size="sm">Draft</UBadge>
    </div>
    <p v-if="!canEdit" class="text-xs text-toned mb-6">
      Only admins can edit published bills.
    </p>
    <p v-else class="text-xs text-toned mb-6">
      Editing updates this bill only (not the template or other drafts).
    </p>

    <UAlert v-if="!roomId" color="info" variant="subtle" icon="i-lucide-info" title="No room yet" />

    <UTheme
      v-else-if="loaded && bill"
      :props="{
        inputDate: {
          size: 'lg',
          ui: {
            base: 'w-full',
          },
        },
        inputNumber: {
          size: 'lg',
          ui: {
            root: 'w-full',
            base: 'w-full',
          },
        },
        select: {
          size: 'lg',
          ui: {
            base: 'w-full',
          },
        },
        selectMenu: {
          size: 'lg',
          ui: {
            base: 'w-full',
          },
        },
        textarea: {
          size: 'lg',
          ui: {
            root: 'w-full',
          },
        },
      }"
    >
      <UForm :schema="formSchema" :state="state" class="space-y-6" @submit="onSave">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Amount" name="amountMajor" required>
            <UInputNumber v-model="state.amountMajor" :min="0" :disabled="!canEdit" />
          </UFormField>

          <UFormField label="Currency" name="currency">
            <USelect v-model="state.currency" :items="['USD', 'KHR']" :disabled="!canEdit" />
          </UFormField>
        </div>

        <UFormField label="Description" name="description" required>
          <UTextarea
            v-model="state.description"
            placeholder="e.g. Morning groceries"
            :rows="4"
            :autoresize="true"
            :disabled="!canEdit"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Date" name="date" required>
            <UInputDate v-model="dateValue" :disabled="!canEdit" />
          </UFormField>
          <UFormField label="Paid by" name="paidByMembershipId" required>
            <USelectMenu
              v-model="state.paidByMembershipId"
              :items="members.map((m) => ({ label: m.displayName, value: m.id }))"
              value-key="value"
              :disabled="!canEdit"
            />
          </UFormField>
        </div>

        <UFormField label="Category" name="categoryId" required>
          <div v-if="categories.length === 0" class="text-sm text-toned">No categories yet.</div>
          <URadioGroup
            v-else
            v-model="state.categoryId"
            :items="categories"
            label-key="name"
            value-key="id"
            variant="table"
            orientation="horizontal"
            indicator="hidden"
            :ui="{
              item: 'flex-1',
            }"
            :disabled="!canEdit"
          />
        </UFormField>

        <UFormField label="Attendees" name="attendees" required>
          <div v-if="members.length === 0" class="text-sm text-toned">No members yet.</div>
          <UCheckboxGroup
            v-else
            v-model="state.attendees"
            :items="memberCheckboxItems"
            variant="table"
            orientation="horizontal"
            indicator="hidden"
            :disabled="!canEdit"
          />
        </UFormField>

        <UFormField v-if="weights.length > 0" label="Shares percent" :error="attendeeError">
          <template #hint>
            <UButton
              label="Reset to equal"
              size="xs"
              variant="soft"
              :disabled="!canEdit"
              @click="rebalance"
            />
          </template>

          <UTable
            :data="weights"
            :columns="columns"
            :ui="{
              root: 'w-full',
              thead: 'hidden',
            }"
          />
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :title="error"
          icon="i-lucide-alert-circle"
        />
        <UAlert
          v-if="notice"
          color="success"
          variant="subtle"
          :title="notice"
          icon="i-lucide-check-circle"
        />

        <div class="flex flex-wrap gap-3 pt-2">
          <UButton
            type="submit"
            label="Save"
            :loading="submitting"
            :disabled="!canEdit || totalWeight !== 10000 || submitting"
          />
          <UButton
            v-if="canEdit"
            label="Delete"
            color="error"
            variant="ghost"
            :disabled="submitting"
            @click="onDelete"
          />
        </div>
      </UForm>
    </UTheme>
  </UContainer>
</template>