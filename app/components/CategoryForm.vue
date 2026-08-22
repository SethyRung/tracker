<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Member {
  id: string;
  userId: string;
  displayName: string;
  nickname?: string | null;
}

const props = defineProps<{ roomId: string; members: Member[] }>();
const emit = defineEmits<{ refresh: [] }>();

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
    amountMajor: z.number().positive("Amount must be greater than 0").optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1, "Pick who pays").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recurringType !== "recurring") return;
    if (data.currency == null) {
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Required" });
    }
    if (data.amountMajor == null) {
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
  dayOfMonth: 1,
  isActive: true,
  currency: "USD",
});
const weights = ref<Array<{ name: string; membershipId: string; weightBps: number }>>([]);

const open = ref(false);

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

function reset() {
  state.name = undefined;
  state.recurringType = undefined;
  state.currency = "USD";
  state.amountMajor = undefined;
  state.dayOfMonth = 1;
  state.isActive = true;
  state.paidByMembershipId = members.value.find((m) => m.userId === user.value?.id)?.id;
  weights.value = [];
}

watch(
  open,
  (value) => {
    if (!value) reset();
  },
  {
    immediate: true,
  },
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
          ...data,
          amountMinor: toAmountMinor(data.currency, data.amountMajor),
          memberSnapshot: weights.value,
        }
      : { name: data.name, recurringType: data.recurringType };

    const res = await $fetch(`/api/rooms/${props.roomId}/categories`, { method: "POST", body });

    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    open.value = false;
    toast.add({ icon: "i-lucide-circle-check", title: "Category created" });
    emit("refresh");
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
</script>

<template>
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    title="New category"
    description="Add a label to organise entries in this room."
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
            <UInputNumber
              v-model="state.dayOfMonth"
              :min="1"
              :max="31"
              size="lg"
              :ui="{ root: 'w-full' }"
            />
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
        label="Add"
        size="lg"
        :block="!isMD"
        :loading="submitting"
      />
    </template>
  </component>
</template>
