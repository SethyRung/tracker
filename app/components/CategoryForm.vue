<script setup lang="ts">
import { CalendarDate } from "@internationalized/date";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Member {
  id: string;
  userId: string;
  displayName: string;
  nickname?: string | null;
}

interface CategoryTemplate {
  currency: "USD" | "KHR";
  amountMinor: number;
  dayOfMonth: number;
  isActive: boolean;
  paidByMembershipId?: string | null;
  memberSnapshot: Array<{ membershipId: string; weightBps: number }>;
}

interface Category {
  id: string;
  name: string;
  recurringType: "unlimited" | "once" | "recurring";
  template?: CategoryTemplate | null;
}

const props = defineProps<{ roomId: string; members: Member[]; category?: Category | null }>();
const emit = defineEmits<{ refresh: [] }>();
const open = defineModel<boolean>("open", { default: false });

const isEdit = computed(() => !!props.category?.id);

const toast = useToast();

const { user } = useUserSession();

const members = computed(() => props.members);

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

const schema = z
  .object({
    name: z
      .string("Name is required")
      .min(1, "Name is required")
      .max(40, "Keep it under 40 characters"),
    recurringType: z.enum(["unlimited", "once", "recurring"], "Recurring type is required"),
    currency: z.enum(["USD", "KHR"]).optional(),
    amountMajor: z.number().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1, "Pick who pays").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recurringType !== "recurring") return;
    if (data.currency == null) {
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Required" });
    }
    if (data.amountMajor == null || data.amountMajor <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amountMajor"],
        message: "Amount must be greater than 0",
      });
    }
    if (data.dayOfMonth == null) {
      ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: "Required" });
    }
    if (typeof data.isActive !== "boolean") {
      ctx.addIssue({ code: "custom", path: ["isActive"], message: "Required" });
    }
    if (!data.paidByMembershipId) {
      ctx.addIssue({ code: "custom", path: ["paidByMembershipId"], message: "Pick who pays" });
    }
  });

type Schema = z.output<typeof schema>;

function isRecurring(data: Schema): data is Required<Schema> {
  return (
    data.recurringType === "recurring" &&
    data.currency != null &&
    data.amountMajor != null &&
    data.dayOfMonth != null &&
    typeof data.isActive === "boolean" &&
    !!data.paidByMembershipId
  );
}

const state = reactive<Partial<Schema>>({
  amountMajor: 0,
  dayOfMonth: 1,
  isActive: true,
  currency: "USD",
});

const dayPickerMonth = new CalendarDate(2000, 1, 1);

const dayOfMonthValue = computed({
  get: () => new CalendarDate(dayPickerMonth.year, dayPickerMonth.month, state.dayOfMonth ?? 1),
  set: (value) => {
    if (value && "day" in value) state.dayOfMonth = value.day;
  },
});

function dayOrdinal(day: number) {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

const weights = ref<Array<{ name: string; membershipId: string; weightBps: number }>>([]);
const hydrating = ref(false);

const submitting = ref(false);

const { isMD } = useBreakpoints();

const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");

const OverlayComponent = computed(() => {
  return {
    is: isMD.value ? UModal : UDrawer,
    props: isMD.value ? { ui: { footer: "justify-end" } } : { handleOnly: true, fixed: true },
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

watch(
  () => state.recurringType,
  (type) => {
    if (hydrating.value) return;
    if (type === "recurring") {
      weights.value = members.value.map((m) => ({
        name: m.displayName || m.nickname || "—",
        membershipId: m.id,
        weightBps: 0,
      }));
      equalSplit();
    } else weights.value = [];
  },
);

function defaultPayerId() {
  return members.value.find((m) => m.userId === user.value?.id)?.id;
}

function memberLabel(membershipId: string) {
  const member = members.value.find((m) => m.id === membershipId);
  return member?.displayName || member?.nickname || "—";
}

function reset() {
  hydrating.value = true;
  state.name = undefined;
  state.recurringType = undefined;
  state.currency = "USD";
  state.amountMajor = 0;
  state.dayOfMonth = 1;
  state.isActive = true;
  state.paidByMembershipId = defaultPayerId();
  weights.value = [];
  nextTick(() => {
    hydrating.value = false;
  });
}

function populate(category: Category) {
  hydrating.value = true;
  state.name = category.name;
  state.recurringType = category.recurringType;

  const template = category.template;
  if (category.recurringType === "recurring" && template) {
    state.currency = template.currency;
    state.amountMajor = toAmountMajor(template.currency, template.amountMinor);
    state.dayOfMonth = template.dayOfMonth;
    state.isActive = template.isActive;
    state.paidByMembershipId = template.paidByMembershipId ?? defaultPayerId();
    weights.value = template.memberSnapshot.map((w) => ({
      name: memberLabel(w.membershipId),
      membershipId: w.membershipId,
      weightBps: w.weightBps,
    }));
  } else {
    state.currency = "USD";
    state.amountMajor = 0;
    state.dayOfMonth = 1;
    state.isActive = true;
    state.paidByMembershipId = defaultPayerId();
    weights.value = [];
  }

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
    if (props.category) populate(props.category);
    else reset();
  },
  { immediate: true },
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.roomId || submitting.value) return;

  const { data } = event;

  if (isRecurring(data) && !shareState.value.valid) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Shares must total 100%",
      description: shareState.value.message,
    });
    return;
  }

  submitting.value = true;
  try {
    const body = isRecurring(data)
      ? {
          name: data.name,
          recurringType: data.recurringType,
          currency: data.currency,
          amountMinor: toAmountMinor(data.currency, data.amountMajor),
          dayOfMonth: data.dayOfMonth,
          isActive: data.isActive,
          paidByMembershipId: data.paidByMembershipId,
          memberSnapshot: weights.value.map(({ membershipId, weightBps }) => ({
            membershipId,
            weightBps,
          })),
        }
      : { name: data.name, recurringType: data.recurringType };

    const res =
      isEdit.value && props.category
        ? await $fetch(`/api/rooms/${props.roomId}/categories/${props.category.id}`, {
            method: "PATCH",
            body,
          })
        : await $fetch(`/api/rooms/${props.roomId}/categories`, { method: "POST", body });

    if (!res || res.status.code !== ApiResponseCode.Success) {
      throw new Error(res?.status.message || "Could not save category.");
    }

    const updated = isEdit.value;
    open.value = false;
    toast.add({
      icon: "i-lucide-circle-check",
      title: updated ? "Category updated" : "Category created",
    });
    emit("refresh");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not save category.",
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
    :title="isEdit ? 'Edit category' : 'New category'"
    :description="
      isEdit
        ? 'Update this category and its recurring settings.'
        : 'Add a label to organise entries in this room.'
    "
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <UForm
        id="category-form"
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput
            v-model="state.name"
            size="lg"
            autofocus
            placeholder="e.g. Rent"
            :ui="{ root: 'w-full' }"
          />
        </UFormField>

        <UFormField label="Type" name="recurringType">
          <URadioGroup
            v-model="state.recurringType"
            :items="recurringTypeItems"
            variant="card"
            size="lg"
            :ui="{ item: 'w-full', description: 'text-wrap' }"
          />
        </UFormField>

        <template v-if="state.recurringType === 'recurring'">
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
              :ui="{ item: 'flex-1 justify-center' }"
            />
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
            <template #help>Who fronts this expense each month.</template>
          </UFormField>

          <UFormField
            label="Day of month"
            name="dayOfMonth"
            description="Posted on this day each month."
          >
            <UPopover>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar"
                size="lg"
                block
                :label="dayOrdinal(state.dayOfMonth ?? 1)"
                :ui="{ base: 'justify-start' }"
              />

              <template #content="{ close }">
                <UCalendar
                  v-model="dayOfMonthValue"
                  prevent-deselect
                  :month-controls="false"
                  :year-controls="false"
                  :view-control="false"
                  :week-starts-on="1"
                  :ui="{ header: 'hidden' }"
                  @update:model-value="close"
                />
              </template>
            </UPopover>
          </UFormField>

          <UFormField label="Active" name="isActive" orientation="horizontal">
            <USwitch v-model="state.isActive" size="lg" />
          </UFormField>

          <UFormField label="Attendees" :error="shareState.message">
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
            <p class="text-xs text-toned mt-2">Total: {{ shareState.current.toFixed(2) }}%</p>
          </UFormField>
        </template>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton v-if="isMD" label="Cancel" color="neutral" variant="ghost" @click="close" />

      <UButton
        type="submit"
        form="category-form"
        :label="isEdit ? 'Save' : 'Add'"
        size="lg"
        :block="!isMD"
        :loading="submitting"
      />
    </template>
  </component>
</template>
