<script setup lang="ts">
import { parseDate } from "@internationalized/date";
import type { FormSubmitEvent, TableRow } from "@nuxt/ui";
import { type TableColumn } from "@nuxt/ui";
import { z } from "zod";

const UAvatar = resolveComponent("UAvatar");
const UIcon = resolveComponent("UIcon");
const UInputNumber = resolveComponent("UInputNumber");

definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "New Bill · Tricker" });

const router = useRouter();

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const { data: roomRes } = await useFetch("/api/rooms/current");
const roomId = computed(() => roomRes.value?.data?.room?.id ?? null);

const { members, categories } = await useRoomLists(roomId);

const paidByDefault = computed(
  () => members.value.find((m) => m.id === user.value?.id) ?? members.value[0],
);

const entryType = ref<"bill" | "payment">("bill");
const isPayment = computed(() => entryType.value === "payment");

const todayIso = new Date().toISOString().slice(0, 10);

const formSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
  amountMajor: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "KHR"]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .refine((d) => d <= todayIso, "Date cannot be in the future"),
  categoryId: z.string().min(1, "Category is required"),
  paidByMembershipId: z.string().min(1, "Paid by is required"),
  notes: z.string().max(500, "Notes must be at most 500 characters").optional(),
  recurring: z.enum(["one-time", "recurring"], {
    message: "Recurring must be one-time or recurring monthly",
  }),
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
  notes: "",
  recurring: "one-time",
  attendees: [],
});

const dateValue = computed({
  get: () => {
    if (!state.date) return undefined;
    return parseDate(state.date);
  },
  set: (v) => {
    if (!v) {
      state.date = "";
    } else {
      state.date = `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
    }
  },
});

const recurringItems = [
  { label: "One-time", value: "one-time" },
  { label: "Recurring monthly", value: "recurring" },
];

const memberCheckboxItems = computed(() =>
  members.value.map((m) => ({
    label: m.displayName,
    value: m.id,
  })),
);

const attendees = computed({
  get: () => state.attendees,
  set: (v: string[]) => {
    state.attendees = v;
  },
});

const weights = ref<Array<{ membershipId: string; weightBps: number }>>([]);

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
    meta: {
      class: {
        td: "w-40",
      },
    },
  },
];

watch(
  () => state.attendees,
  (newAttendees) => {
    weights.value = newAttendees.map((mid) => {
      const existing = weights.value.find((w) => w.membershipId === mid);
      return existing ?? { membershipId: mid, weightBps: 0 };
    });
    rebalance();
  },
);

function rebalance() {
  const n = weights.value.length;
  if (n === 0) return;
  const base = Math.floor(10000 / n);
  weights.value.forEach((w) => (w.weightBps = base));
  const remainder = 10000 - base * n;
  if (remainder > 0 && weights.value[0]) weights.value[0].weightBps += remainder;
}

watch(
  () => members.value,
  (m) => {
    if (m.length > 0 && state.attendees.length === 0) {
      state.attendees = m.map((mm) => mm.id);
    }
  },
  { immediate: true },
);

const totalWeightPct = computed(() => weights.value.reduce((s, w) => s + w.weightBps, 0) / 100);

const attendeeError = computed(() => {
  if (Math.abs(totalWeightPct.value - 100) > 0.01)
    return `Shares must total 100.00% (currently ${totalWeightPct.value.toFixed(2)}%)`;
  return undefined;
});

const submitting = ref(false);
const error = ref<string | null>(null);

async function onSubmit(event: FormSubmitEvent<FormState>) {
  if (!roomId.value) return;
  if (attendeeError.value) {
    error.value = attendeeError.value;
    return;
  }
  submitting.value = true;
  error.value = null;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/bills`, {
      method: "POST",
      body: {
        categoryId: event.data.categoryId || null,
        currency: event.data.currency,
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
    if (isSuccessResponse(res)) {
      await navigateTo(`/bills/${res.data.bill.id}/edit`);
    }
  } catch (e) {
    error.value = (e as { statusMessage?: string })?.statusMessage ?? "Could not create bill.";
  } finally {
    submitting.value = false;
  }
}

function memberName(mid: string) {
  return members.value.find((m) => m.id === mid)?.displayName ?? "—";
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="font-pixel-circle text-2xl text-primary mb-6">New Bill</h1>

      <UButton
        icon="i-lucide:chevron-left"
        label="Back"
        color="neutral"
        variant="outline"
        size="sm"
        @click="router.back"
      />
    </div>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before logging bills."
    />

    <UTheme
      v-else
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
      <UForm :schema="formSchema" :state="state" class="space-y-6" @submit="onSubmit">
        <UFormField label="Type" name="entryType">
          <UFieldGroup>
            <URadioGroup
              v-model="entryType"
              :items="[
                { label: 'Bill', value: 'bill' },
                { label: 'Payment', value: 'payment' },
              ]"
              variant="table"
              orientation="horizontal"
              indicator="hidden"
            />
          </UFieldGroup>
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Amount" name="amountMajor" required>
            <UInputNumber v-model="state.amountMajor" :min="0" />
          </UFormField>

          <UFormField label="Currency" name="currency">
            <USelect v-model="state.currency" :items="['USD', 'KHR']" />
          </UFormField>
        </div>

        <UFormField label="Description" name="description" required>
          <UTextarea
            v-model="state.description"
            placeholder="e.g. Morning groceries"
            :rows="4"
            :autoresize="true"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Date" name="date" required>
            <UInputDate v-model="dateValue" />
          </UFormField>
          <UFormField label="Paid by" name="paidByMembershipId" required>
            <USelectMenu
              v-model="state.paidByMembershipId"
              :items="members.map((m) => ({ label: m.displayName, value: m.id }))"
              value-key="value"
            />
          </UFormField>
        </div>

        <UFormField label="Category" name="categoryId" required>
          <div v-if="categories.length === 0" class="text-sm text-toned">No categories yet.</div>

          <URadioGroup
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
          />
        </UFormField>

        <UFormField v-if="weights.length > 0" label="Shares percent" :error="attendeeError">
          <template #hint>
            <UButton
              label="Reset to equal"
              size="xs"
              variant="soft"
              class="mt-2"
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

        <UFormField label="Notes" name="notes" hint="Optional">
          <UTextarea
            v-model="state.notes"
            :rows="3"
            placeholder="e.g. Bought at Phsar..."
            :autoresize="true"
          />
        </UFormField>

        <UFormField
          v-if="!isPayment"
          label="Recurring?"
          name="recurring"
          :help="
            state.recurring === 'recurring'
              ? 'Recurring templates wire up in Phase 7 — UI-ready now.'
              : ''
          "
        >
          <URadioGroup v-model="state.recurring" :items="recurringItems" />
        </UFormField>

        <UButton type="submit" label="Save Bill" block :loading="submitting" />
      </UForm>
    </UTheme>
  </UContainer>
</template>
