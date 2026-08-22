<script setup lang="ts">
import { CalendarDate, parseAbsolute, today } from "@internationalized/date";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Member {
  id: string;
  userId: string;
  displayName: string;
  nickname?: string | null;
}

interface Category {
  id: string;
  name: string;
  recurringType?: "unlimited" | "once" | "recurring";
}

interface Entry {
  id: string;
  notes: string | null;
  currency: string;
  amountMinor: number;
  date: string;
  paidByMembershipId: string;
  categoryId: string | null;
  templateId?: string | null;
  weights: Array<{ membershipId: string; weightBps: number }>;
}

const props = withDefaults(
  defineProps<{
    roomId: string;
    members: Member[];
    categories: Category[];
    blockedCategoryIds?: string[];
    entry?: Entry | null;
  }>(),
  { blockedCategoryIds: () => [] },
);

const emit = defineEmits<{ refresh: [] }>();
const open = defineModel<boolean>("open", { default: false });

const isEdit = computed(() => !!props.entry?.id);
const isRecurringEntry = computed(
  () =>
    !!props.entry?.templateId ||
    props.categories.find((c) => c.id === props.entry?.categoryId)?.recurringType === "recurring",
);

const toast = useToast();
const { user } = useUserSession();

const members = computed(() => props.members);

const schema = z.object({
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
  paidByMembershipId: z.string().min(1, "Pick who pays"),
  attendees: z.array(z.string()).min(1, "At least one attendee is required"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  amountMajor: 0,
  currency: "USD",
  date: new Date().toISOString(),
  attendees: [],
});

function toCalendarDate(iso: string) {
  const zoned = parseAbsolute(iso, "Asia/Phnom_Penh");
  return new CalendarDate(zoned.year, zoned.month, zoned.day);
}

function toDateIso(value: CalendarDate) {
  return value.toDate("Asia/Phnom_Penh").toISOString();
}

const maxDate = today("Asia/Phnom_Penh");

const dateValue = computed({
  get: () => (state.date ? toCalendarDate(state.date) : undefined),
  set: (value) => {
    if (!value || !("year" in value)) state.date = "";
    else state.date = toDateIso(new CalendarDate(value.year, value.month, value.day));
  },
});

function formatDateLabel(iso?: string) {
  if (!iso) return "Pick a date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date(iso));
}

const memberCheckboxItems = computed(() =>
  members.value.map((m) => ({ label: m.displayName || m.nickname || "—", value: m.id })),
);

const displayCategories = computed(() => {
  if (props.entry) return props.categories;
  const blocked = new Set(props.blockedCategoryIds ?? []);
  return props.categories.filter((c) => {
    if (c.recurringType === "recurring") return false;
    if (c.recurringType === "once" && blocked.has(c.id)) return false;
    return true;
  });
});

const weights = ref<Array<{ name: string; membershipId: string; weightBps: number }>>([]);
const hydrating = ref(false);
const submitting = ref(false);

const { isMD } = useBreakpoints();

const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");

const OverlayComponent = computed(() => {
  return {
    is: isMD.value ? UModal : UDrawer,
    props: isMD.value
      ? { scrollable: true, ui: { footer: "justify-end" } }
      : { handleOnly: true, fixed: true },
  };
});

const shareState = computed(() => {
  const current = weights.value.reduce((s, w) => s + w.weightBps, 0) / 100;
  const valid = Math.abs(current - 100) <= 0.01;

  return {
    current,
    target: 100,
    valid,
    message: valid ? undefined : `Shares must total 100% (currently ${current.toFixed(2)}%)`,
  };
});

function equalSplit() {
  const n = weights.value.length;
  if (n === 0) return;
  const base = Math.floor(10000 / n);
  weights.value.forEach((w) => (w.weightBps = base));
  const remainder = 10000 - base * n;
  if (remainder > 0 && weights.value[0]) weights.value[0].weightBps += remainder;
}

function defaultPayerId() {
  return members.value.find((m) => m.userId === user.value?.id)?.id ?? members.value[0]?.id;
}

function memberLabel(membershipId: string) {
  const member = members.value.find((m) => m.id === membershipId);
  return member?.displayName || member?.nickname || "—";
}

watch(
  () => state.attendees,
  (next) => {
    const ids = next ?? [];
    weights.value = ids.map((mid) => {
      const existing = weights.value.find((w) => w.membershipId === mid);
      return existing ?? { name: memberLabel(mid), membershipId: mid, weightBps: 0 };
    });
    if (!hydrating.value) equalSplit();
  },
);

function reset() {
  hydrating.value = true;
  state.description = undefined;
  state.amountMajor = 0;
  state.currency = "USD";
  state.date = toDateIso(today("Asia/Phnom_Penh"));
  state.categoryId = undefined;
  state.paidByMembershipId = defaultPayerId();
  weights.value = members.value.map((m) => ({
    name: m.displayName || m.nickname || "—",
    membershipId: m.id,
    weightBps: 0,
  }));
  state.attendees = members.value.map((m) => m.id);
  equalSplit();
  nextTick(() => {
    hydrating.value = false;
  });
}

function populate(entry: Entry) {
  hydrating.value = true;
  state.description = entry.notes ?? undefined;
  state.currency = entry.currency as Schema["currency"];
  state.amountMajor = toAmountMajor(entry.currency as Currency, entry.amountMinor);
  state.date = entry.date ? toDateIso(toCalendarDate(new Date(entry.date).toISOString())) : "";
  state.paidByMembershipId = entry.paidByMembershipId;
  state.categoryId = entry.categoryId ?? undefined;
  weights.value = entry.weights.map((w) => ({
    name: memberLabel(w.membershipId),
    membershipId: w.membershipId,
    weightBps: w.weightBps,
  }));
  state.attendees = weights.value.map((w) => w.membershipId);
  nextTick(() => {
    hydrating.value = false;
  });
}

watch(
  open,
  async (value) => {
    if (!value) {
      reset();
      return;
    }
    await nextTick();
    if (isRecurringEntry.value) {
      open.value = false;
      toast.add({
        icon: "i-lucide-circle-x",
        title: "Edit this in Categories",
        description: "Recurring entries are managed from the category template.",
      });
      return;
    }
    if (props.entry) populate(props.entry);
    else reset();
  },
  { immediate: true },
);

watch(members, (list) => {
  if (!open.value || hydrating.value || isEdit.value) return;
  if (list.length > 0 && (!state.attendees || state.attendees.length === 0)) {
    state.attendees = list.map((m) => m.id);
  }
  if (!state.paidByMembershipId) state.paidByMembershipId = defaultPayerId();
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.roomId || submitting.value || isRecurringEntry.value) return;

  if (!shareState.value.valid) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Shares must total 100%",
      description: shareState.value.message,
    });
    return;
  }

  const { data } = event;
  const amountMinor = toAmountMinor(data.currency, data.amountMajor);
  const memberSnapshot = weights.value.map(({ membershipId, weightBps }) => ({
    membershipId,
    weightBps,
  }));

  submitting.value = true;
  try {
    const res =
      isEdit.value && props.entry
        ? await $fetch(`/api/rooms/${props.roomId}/entries/${props.entry.id}`, {
            method: "PATCH",
            body: {
              categoryId: data.categoryId || null,
              amountMinor,
              date: data.date,
              paidByMembershipId: data.paidByMembershipId,
              notes: data.description || null,
              weights: memberSnapshot,
            },
          })
        : await $fetch(`/api/rooms/${props.roomId}/entries`, {
            method: "POST",
            body: {
              categoryId: data.categoryId || null,
              currency: data.currency,
              amountMinor,
              date: data.date,
              paidByMembershipId: data.paidByMembershipId,
              notes: data.description || null,
              weights: memberSnapshot,
            },
          });

    if (!res || res.status.code !== ApiResponseCode.Success) {
      throw new Error(res?.status.message || "Could not save entry.");
    }

    const updated = isEdit.value;
    open.value = false;
    toast.add({
      icon: "i-lucide-circle-check",
      title: updated ? "Entry updated" : "Entry created",
    });
    emit("refresh");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not save entry.",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    :title="isEdit ? 'Edit entry' : 'New entry'"
    :description="
      isEdit ? 'Update this bill. Changes apply to this entry only.' : 'Log a bill for this room.'
    "
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <UForm id="entry-form" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <UFormField label="Amount" name="amountMajor" required>
          <UInputNumber v-model="state.amountMajor" :min="0" size="lg" :ui="{ root: 'w-full' }" />
        </UFormField>

        <UFormField label="Currency" name="currency" required>
          <URadioGroup
            v-model="state.currency"
            :items="[
              { label: 'USD', value: 'USD' },
              { label: 'KHR', value: 'KHR' },
            ]"
            variant="table"
            orientation="horizontal"
            indicator="hidden"
            size="lg"
            :disabled="isEdit"
            :ui="{ item: 'flex-1 justify-center' }"
          />
        </UFormField>

        <UFormField label="Description" name="description">
          <UTextarea
            v-model="state.description"
            placeholder="e.g. Morning groceries"
            :rows="3"
            autoresize
            size="lg"
            :ui="{ root: 'w-full' }"
          />
        </UFormField>

        <UFormField label="Date" name="date" required>
          <UPopover>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar"
              size="lg"
              block
              :label="formatDateLabel(state.date)"
              :ui="{ base: 'justify-start' }"
            />

            <template #content="{ close }">
              <UCalendar
                v-model="dateValue"
                prevent-deselect
                :week-starts-on="1"
                :max-value="maxDate"
                @update:model-value="close"
              />
            </template>
          </UPopover>
        </UFormField>

        <UFormField label="Paid by" name="paidByMembershipId" required>
          <USelect
            v-model="state.paidByMembershipId"
            :items="members"
            label-key="displayName"
            value-key="id"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Category" name="categoryId" required>
          <div v-if="categories.length === 0" class="text-sm text-toned">No categories yet.</div>
          <div v-else-if="displayCategories.length === 0" class="text-sm text-toned">
            No categories available — recurring ones are managed on the
            <NuxtLink :to="`/rooms/${roomId}/categories`" class="text-primary underline">
              Recurring
            </NuxtLink>
            page; once-a-month categories can be logged once per month.
          </div>
          <URadioGroup
            v-else
            v-model="state.categoryId"
            :items="displayCategories"
            label-key="name"
            value-key="id"
            variant="table"
            orientation="horizontal"
            indicator="hidden"
            size="lg"
            :ui="{ item: 'flex-1' }"
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
            size="lg"
          />
        </UFormField>

        <UFormField v-if="weights.length > 0" label="Shares" :error="shareState.message">
          <template #hint>
            <UButton label="Reset to equal" size="xs" variant="soft" @click="equalSplit" />
          </template>

          <ul class="space-y-3">
            <li v-for="w in weights" :key="w.membershipId" class="flex items-center gap-3">
              <span class="flex-1 text-base truncate">{{ w.name }}</span>
              <UInputNumber
                :model-value="w.weightBps / 100"
                :min="0"
                :max="100"
                size="lg"
                orientation="vertical"
                class="w-28"
                @update:model-value="
                  (v: number | null) => (w.weightBps = Math.round(Number(v ?? 0) * 100))
                "
              />
            </li>
          </ul>
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton v-if="isMD" label="Cancel" color="neutral" variant="ghost" @click="close" />

      <UButton
        type="submit"
        form="entry-form"
        :label="isEdit ? 'Save' : 'Add'"
        size="lg"
        :block="!isMD"
        :loading="submitting"
      />
    </template>
  </component>
</template>
