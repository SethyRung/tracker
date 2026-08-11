<script setup lang="ts" generic="false">
import { parseAbsolute } from "@internationalized/date";
import type { FormSubmitEvent, TableColumn } from "@nuxt/ui";
import { z } from "zod";

const UAvatar = resolveComponent("UAvatar");
const UIcon = resolveComponent("UIcon");
const UInputNumber = resolveComponent("UInputNumber");

interface MemberRow {
  id: string;
  displayName: string;
}
interface CategoryRow {
  id: string;
  name: string;
}
interface EntryInitial {
  notes: string | null;
  currency: string;
  amountMinor: number;
  date: string;
  paidByMembershipId: string;
  categoryId: string | null;
  weights: Array<{ membershipId: string; weightBps: number }>;
}

const props = withDefaults(
  defineProps<{
    members: MemberRow[];
    categories: CategoryRow[];
    disabled?: boolean;
    initial?: EntryInitial | null;
  }>(),
  { disabled: false, initial: null },
);

const emit = defineEmits<{
  submit: [{ data: FormState; weights: Array<{ membershipId: string; weightBps: number }> }];
}>();

const { user } = useUserSession();

const paidByDefault = computed(
  () => props.members.find((m) => m.id === user.value?.id) ?? props.members[0],
);

const todayIso = new Date().toISOString();

const formSchema = z.object({
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  amountMajor: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "KHR"]),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((d) => !Number.isNaN(new Date(d).getTime()), "Invalid date")
    .refine((d) => new Date(d).getTime() <= Date.now(), "Date cannot be in the future"),
  categoryId: z.string().min(1, "Category is required"),
  paidByMembershipId: z.string().min(1, "Paid by is required"),
  attendees: z.array(z.string()).min(1, "At least one attendee is required"),
});

type FormState = z.infer<typeof formSchema>;

const state = reactive<FormState>({
  description: "",
  amountMajor: 0,
  currency: "USD",
  date: todayIso,
  categoryId: "",
  paidByMembershipId: paidByDefault.value?.id ?? "",
  attendees: [],
});

const dateValue = computed({
  get: () => (state.date ? parseAbsolute(state.date, "Asia/Phnom_Penh") : undefined),
  set: (v) => {
    if (!v) state.date = "";
    else state.date = v.toDate().toISOString();
  },
});

const memberCheckboxItems = computed(() =>
  props.members.map((m) => ({ label: m.displayName, value: m.id })),
);

const weights = ref<Array<{ membershipId: string; weightBps: number }>>([]);
const suppressRebalance = ref(false);

function memberName(mid: string) {
  return props.members.find((m) => m.id === mid)?.displayName ?? "—";
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

// Default new entries to every active member with an equal split (SPEC §7b/§8).
watch(
  () => props.members,
  (m) => {
    if (m.length > 0 && state.attendees.length === 0) {
      state.attendees = m.map((mm) => mm.id);
    }
  },
  { immediate: true },
);

// Pre-fill from an existing entry (edit page). Preserves the loaded weights by
// suppressing the equal-split rebalance during the attendees change.
async function populate(data: EntryInitial) {
  suppressRebalance.value = true;
  weights.value = data.weights.map((w) => ({
    membershipId: w.membershipId,
    weightBps: w.weightBps,
  }));
  state.description = data.notes ?? "";
  state.currency = data.currency as (typeof state)["currency"];
  state.amountMajor = data.currency === "USD" ? data.amountMinor / 100 : data.amountMinor;
  state.date = data.date ? new Date(data.date).toISOString() : "";
  state.paidByMembershipId = data.paidByMembershipId;
  state.categoryId = data.categoryId ?? "";
  state.attendees = weights.value.map((w) => w.membershipId);
  await nextTick();
  suppressRebalance.value = false;
}

watch(
  () => props.initial,
  (val) => {
    if (val) void populate(val);
  },
  { immediate: true },
);

const totalWeight = computed(() => weights.value.reduce((s, w) => s + w.weightBps, 0));
const totalWeightPct = computed(() => totalWeight.value / 100);
const attendeeError = computed(() =>
  Math.abs(totalWeightPct.value - 100) > 0.01
    ? `Shares must total 100.00% (currently ${totalWeightPct.value.toFixed(2)}%)`
    : undefined,
);

const columns: TableColumn<(typeof weights.value)[number]>[] = [
  {
    id: "member",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(UAvatar, { alt: memberName(row.original.membershipId) }),
        h("span", { class: "text-sm font-medium truncate" }, memberName(row.original.membershipId)),
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
        disabled: props.disabled,
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

function onValidSubmit(event: FormSubmitEvent<FormState>) {
  if (attendeeError.value) return;
  emit("submit", { data: event.data, weights: weights.value });
}
</script>

<template>
  <UTheme
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
    <UForm :schema="formSchema" :state="state" class="space-y-6" @submit="onValidSubmit">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Amount" name="amountMajor" required>
          <UInputNumber v-model="state.amountMajor" :min="0" :disabled="disabled" />
        </UFormField>

        <UFormField label="Currency" name="currency">
          <USelect v-model="state.currency" :items="['USD', 'KHR']" :disabled="disabled" />
        </UFormField>
      </div>

      <UFormField label="Description" name="description">
        <UTextarea
          v-model="state.description"
          placeholder="e.g. Morning groceries"
          :rows="4"
          :autoresize="true"
          :disabled="disabled"
        />
      </UFormField>

      <div class="grid sm:grid-cols-2 gap-4">
        <UFormField label="Date" name="date" required>
          <UInputDate v-model="dateValue" granularity="minute" :disabled="disabled" />
        </UFormField>
        <UFormField label="Paid by" name="paidByMembershipId" required>
          <USelectMenu
            v-model="state.paidByMembershipId"
            :items="members.map((m) => ({ label: m.displayName, value: m.id }))"
            value-key="value"
            :disabled="disabled"
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
          :disabled="disabled"
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
          :disabled="disabled"
        />
      </UFormField>

      <UFormField v-if="weights.length > 0" label="Shares percent" :error="attendeeError">
        <template #hint>
          <UButton
            label="Reset to equal"
            size="xs"
            variant="soft"
            :disabled="disabled"
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

      <slot name="actions" :total-weight="totalWeight" :attendee-error="attendeeError" />
    </UForm>
  </UTheme>
</template>
