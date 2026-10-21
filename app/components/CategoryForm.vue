<script setup lang="ts">
import { CalendarDate } from "@internationalized/date";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { bpsToPercent, equalSplitBps, percentToBps, splitRemainderBps } from "#shared/types/weight";

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  userName: string;
  avatarUrl?: string | null;
  joinedAt?: string | Date | null;
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
  currentEntryId?: string | null;
}

interface CategoryFormProps {
  roomId: string;
  members: Member[];
  category?: Category | null;
}

type Weight = { membershipId: string; weightBps: number };
type RecurringType = "unlimited" | "once" | "recurring";

const props = defineProps<CategoryFormProps>();
const emit = defineEmits<{ refresh: [] }>();
const open = defineModel<boolean>("open", { default: false });

const toast = useToast();
const { user } = useUserSession();
const { currentRoom } = useRoomMemberships();

const isEdit = computed(() => !!props.category?.id);
const roomName = computed(() => currentRoom.value?.name ?? "this room");
const memberById = computed(() => new Map(props.members.map((member) => [member.id, member])));

const recurringTypeItems: Array<{
  label: string;
  value: RecurringType;
  icon: string;
}> = [
  { label: "Unlimited", value: "unlimited", icon: "i-lucide-infinity" },
  { label: "Once / mo", value: "once", icon: "i-lucide-shield" },
  { label: "Recurring", value: "recurring", icon: "i-lucide-repeat" },
];

const schema = z
  .object({
    name: z
      .string("Name is required")
      .min(1, "Name is required")
      .max(40, "Keep it under 40 characters"),
    recurringType: z.enum(["unlimited", "once", "recurring"], "Posting rule is required"),
    currency: z.enum(["USD", "KHR"]).optional(),
    amountMajor: z.number().optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean().optional(),
    paidByMembershipId: z.string().min(1, "Pick who pays").optional(),
    syncCurrentEntry: z.boolean().optional(),
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

const state = reactive<Partial<Schema> & { attendees: string[] }>({
  amountMajor: 0,
  dayOfMonth: 1,
  isActive: true,
  currency: "USD",
  syncCurrentEntry: false,
  attendees: [],
});

const weights = ref<Weight[]>([]);
const hydrating = ref(false);
const submitting = ref(false);

const dayPickerMonth = new CalendarDate(2000, 1, 1);
const dayOfMonthValue = computed({
  get: () => new CalendarDate(dayPickerMonth.year, dayPickerMonth.month, state.dayOfMonth ?? 1),
  set: (value) => {
    if (value && "day" in value) state.dayOfMonth = value.day;
  },
});

const canSyncCurrentEntry = computed(
  () => !!props.category?.currentEntryId && isEdit.value && state.recurringType === "recurring",
);

const title = computed(() => (isEdit.value ? "Edit Category" : "New Category"));
const description = computed(() => {
  if (!isEdit.value) return `Add a spending category for ${roomName.value}.`;

  return `Update this category for ${roomName.value}.`;
});

function memberName(member: Member) {
  return member.nickname ?? member.userName ?? "—";
}

function isYou(member: Member) {
  return member.userId === user.value?.id;
}

function memberTitle(member: Member) {
  return isYou(member) ? `${memberName(member)} (You)` : memberName(member);
}

function avatarTheme(isCurrentUser: boolean) {
  return {
    root: isCurrentUser ? "bg-inverted" : "bg-accented",
    fallback: isCurrentUser ? "text-inverted" : "text-default",
  };
}

const memberItems = computed(() =>
  props.members.map((member) => ({
    label: memberTitle(member),
    value: member.id,
    avatar: { text: payerInitials(memberName(member)), size: "2xs" as const },
  })),
);

const selectedPayer = computed(() =>
  state.paidByMembershipId ? memberById.value.get(state.paidByMembershipId) : undefined,
);

const enabledCurrencies = computed<Currency[]>(() => {
  const room = currentRoom.value;
  const enabled = (
    [
      ["USD", !room || room.usdEnabled],
      ["KHR", !room || room.khrEnabled],
    ] as const
  )
    .filter(([, on]) => on)
    .map(([currency]) => currency);
  return enabled.length ? enabled : ["USD", "KHR"];
});

const currencyChoices = computed(() =>
  state.currency && !enabledCurrencies.value.includes(state.currency)
    ? [...enabledCurrencies.value, state.currency]
    : enabledCurrencies.value,
);

const currencyItems = computed(() =>
  currencyChoices.value.map((currency) => ({ label: currency, value: currency })),
);

const activeCurrency = computed<Currency>(() => state.currency ?? "USD");

function defaultCurrency(): Currency {
  return enabledCurrencies.value.includes("USD") ? "USD" : enabledCurrencies.value[0]!;
}

const currencySymbol = computed(() => (activeCurrency.value === "KHR" ? "៛" : "$"));
const ledgerNote = computed(
  () => `Independent ${activeCurrency.value} ledger. Zero currency conversion distortion.`,
);

const typeHelp = computed(() => {
  switch (state.recurringType) {
    case "unlimited":
      return "Log as many entries as you want in a month. Split is set on each bill.";
    case "once":
      return "One entry per month. A second is blocked; edit the existing one.";
    case "recurring":
      return `Auto-posts on the ${dayOrdinal(state.dayOfMonth ?? 1)} at 00:00 ICT. Edit while the month is open.`;
    default:
      return "Choose how bills in this category are allowed to post.";
  }
});

const shareState = computed(() => {
  const current = bpsToPercent(weights.value.reduce((sum, weight) => sum + weight.weightBps, 0));
  const valid = Math.abs(current - 100) <= 0.01;
  const currentLabel = Number.isInteger(current) ? String(current) : current.toFixed(2);
  return {
    valid,
    message: valid ? undefined : `Shares must total 100% (currently ${current.toFixed(2)}%)`,
    label: valid ? "Total: 100% (Balanced)" : `Total: ${currentLabel}% (Unbalanced)`,
    color: (valid ? "success" : "error") as "success" | "error",
    icon: valid ? "i-lucide-circle-check" : "i-lucide-circle-alert",
  };
});

const equalLabel = computed(() =>
  (state.attendees?.length ?? 0) === 2 ? "Reset to equal (50/50)" : "Reset to equal",
);

function moneyLabel(amountMinor: number, currency = activeCurrency.value) {
  return formatMoney({ amount_minor: amountMinor, currency });
}

const saveLabel = computed(() => {
  const verb = isEdit.value ? "Save Category" : "Create Category";
  if (state.recurringType !== "recurring") return verb;
  return `${verb} (${moneyLabel(toAmountMinor(activeCurrency.value, state.amountMajor ?? 0))})`;
});

function joinedTime(membershipId: string) {
  const raw = memberById.value.get(membershipId)?.joinedAt;
  const time = raw ? new Date(raw).getTime() : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

const shareByMember = computed(() => {
  const amountMinor = toAmountMinor(activeCurrency.value, state.amountMajor ?? 0);
  const shares = new Map(
    weights.value.map((row) => [
      row.membershipId,
      Math.floor((amountMinor * row.weightBps) / BPS_TOTAL),
    ]),
  );
  const remainder = amountMinor - [...shares.values()].reduce((sum, value) => sum + value, 0);
  const first = weights.value[0];
  if (remainder > 0 && first) {
    const target = weights.value.reduce((earliest, row) =>
      joinedTime(row.membershipId) < joinedTime(earliest.membershipId) ? row : earliest,
    );
    shares.set(target.membershipId, (shares.get(target.membershipId) ?? 0) + remainder);
  }
  return shares;
});

function shareText(membershipId: string, included: boolean) {
  if (!included) return "Excluded";
  return `${moneyLabel(shareByMember.value.get(membershipId) ?? 0)} share`;
}

function equalSplit() {
  const count = weights.value.length;
  if (!count) return;
  const base = equalSplitBps(count);
  const remainder = splitRemainderBps(count);
  weights.value.forEach((weight, index) => {
    weight.weightBps = base + (index === 0 ? remainder : 0);
  });
}

function defaultPayerId() {
  return props.members.find((member) => isYou(member))?.id ?? props.members[0]?.id;
}

function isAttendee(id: string) {
  return state.attendees.includes(id);
}

watch(
  () => state.attendees,
  (ids = []) => {
    weights.value = ids.map(
      (membershipId) =>
        weights.value.find((weight) => weight.membershipId === membershipId) ?? {
          membershipId,
          weightBps: 0,
        },
    );
    if (!hydrating.value) equalSplit();
  },
);

watch(
  () => state.recurringType,
  (type) => {
    if (hydrating.value) return;
    if (type !== "recurring") {
      state.attendees = [];
      weights.value = [];
      return;
    }
    if (!state.paidByMembershipId) state.paidByMembershipId = defaultPayerId();
    if (!state.currency) state.currency = defaultCurrency();
    if (state.dayOfMonth == null) state.dayOfMonth = 1;
    if (typeof state.isActive !== "boolean") state.isActive = true;
    if (!state.attendees.length) state.attendees = props.members.map((member) => member.id);
  },
);

function setIncluded(membershipId: string, value: boolean | "indeterminate") {
  const selected = new Set(state.attendees);
  if (value === true) selected.add(membershipId);
  else selected.delete(membershipId);
  state.attendees = props.members.map((member) => member.id).filter((id) => selected.has(id));
}

function setPercent(membershipId: string, value: string | number | null) {
  const row = weights.value.find((weight) => weight.membershipId === membershipId);
  if (!row) return;
  const percent = Number(value);
  row.weightBps = Math.min(
    BPS_TOTAL,
    Math.max(0, percentToBps(Number.isFinite(percent) ? percent : 0)),
  );
}

function weightPercent(membershipId: string) {
  const bps = weights.value.find((weight) => weight.membershipId === membershipId)?.weightBps ?? 0;
  return bpsToPercent(bps);
}

function hydrate(apply: () => void) {
  hydrating.value = true;
  apply();
  nextTick(() => {
    hydrating.value = false;
  });
}

function reset() {
  hydrate(() => {
    state.name = undefined;
    state.recurringType = undefined;
    state.currency = defaultCurrency();
    state.amountMajor = 0;
    state.dayOfMonth = 1;
    state.isActive = true;
    state.paidByMembershipId = defaultPayerId();
    state.syncCurrentEntry = false;
    state.attendees = [];
    weights.value = [];
  });
}

function populate(category: Category) {
  hydrate(() => {
    state.name = category.name;
    state.recurringType = category.recurringType;
    state.syncCurrentEntry = false;
    const template = category.template;
    if (category.recurringType === "recurring" && template) {
      state.currency = template.currency;
      state.amountMajor = toAmountMajor(template.currency, template.amountMinor);
      state.dayOfMonth = template.dayOfMonth;
      state.isActive = template.isActive;
      state.paidByMembershipId = template.paidByMembershipId ?? defaultPayerId();
      weights.value = template.memberSnapshot.map(({ membershipId, weightBps }) => ({
        membershipId,
        weightBps,
      }));
      state.attendees = weights.value.map((weight) => weight.membershipId);
      return;
    }
    state.currency = defaultCurrency();
    state.amountMajor = 0;
    state.dayOfMonth = 1;
    state.isActive = true;
    state.paidByMembershipId = defaultPayerId();
    state.attendees = [];
    weights.value = [];
  });
}

function canAutofill() {
  return open.value && !hydrating.value && !isEdit.value;
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

watch(
  () => props.members,
  (list) => {
    if (!canAutofill()) return;
    if (state.recurringType === "recurring" && list.length && !state.attendees.length) {
      state.attendees = list.map((member) => member.id);
    }
    if (!state.paidByMembershipId) state.paidByMembershipId = defaultPayerId();
  },
);

watch(enabledCurrencies, (items) => {
  if (!canAutofill() || (state.currency && items.includes(state.currency))) return;
  state.currency = defaultCurrency();
});

function showError(error: unknown, fallback: string) {
  toast.add({
    icon: "i-lucide-circle-x",
    title: "Error",
    description: error instanceof Error ? error.message : fallback,
  });
}

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

  const recurring = isRecurring(data);
  const payload = recurring
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

  submitting.value = true;
  try {
    const category = props.category;
    const editing = !!category && isEdit.value;
    const res = await $fetch<ApiResponse<unknown>>(
      editing
        ? `/api/rooms/${props.roomId}/categories/${category.id}`
        : `/api/rooms/${props.roomId}/categories`,
      {
        method: editing ? "PATCH" : "POST",
        body:
          editing && recurring
            ? { ...payload, syncCurrentEntry: !!state.syncCurrentEntry }
            : payload,
      },
    );
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    open.value = false;
    toast.add({
      icon: "i-lucide-circle-check",
      title: editing ? "Category updated" : "Category created",
    });
    emit("refresh");
  } catch (error) {
    showError(error, "Could not save category.");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Panel
    v-model:open="open"
    :title="title"
    :description="description"
    :modal="{
      scrollable: true,
      ui: {
        content: 'max-w-2xl rounded-2xl',
        title: 'text-xl font-bold tracking-tight',
        description: 'text-xs',
        footer: 'bg-muted/50',
      },
    }"
    :drawer="{
      ui: {
        content: 'rounded-t-2xl',
        title: 'text-lg font-bold tracking-tight',
        description: 'text-xs',
      },
    }"
  >
    <slot />

    <template #body>
      <UTheme
        :props="{
          button: { size: 'lg' },
          formField: {
            ui: {
              label: 'font-mono text-xs font-semibold tracking-wider text-muted uppercase',
            },
          },
          input: { size: 'lg', ui: { root: 'w-full' } },
          select: { size: 'lg', ui: { base: 'w-full' } },
          tabs: { size: 'lg' },
        }"
      >
        <UForm
          id="category-form"
          :schema="schema"
          :state="state"
          class="space-y-5"
          @submit="onSubmit"
        >
          <UAlert
            v-if="isEdit && category?.recurringType === 'recurring'"
            icon="i-lucide-repeat"
            title="Recurring template"
            description="Edits change future auto-posts. This month's bill stays as posted unless you update it too."
            variant="subtle"
          />

          <UFormField label="Category name" name="name" required>
            <UInput v-model="state.name" autofocus placeholder="e.g. Rent" />
          </UFormField>

          <UFormField label="Posting rule" name="recurringType" required>
            <div class="grid grid-cols-3 gap-2">
              <UButton
                v-for="item in recurringTypeItems"
                :key="item.value"
                :icon="item.icon"
                :label="item.label"
                size="sm"
                :color="state.recurringType === item.value ? 'primary' : 'neutral'"
                :variant="state.recurringType === item.value ? 'soft' : 'outline'"
                class="justify-center rounded-full"
                @click="state.recurringType = item.value"
              />
            </div>

            <p class="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
              <UIcon name="i-lucide-info" class="size-3.5 shrink-0 text-primary" />
              {{ typeHelp }}
            </p>
          </UFormField>

          <template v-if="state.recurringType === 'recurring'">
            <UFormField label="Amount & currency" name="amountMajor" required>
              <div class="flex items-center gap-2">
                <UInput v-model="state.amountMajor" type="number">
                  <template #leading>
                    <span class="font-mono text-xl font-bold text-highlighted sm:text-3xl">
                      {{ currencySymbol }}
                    </span>
                  </template>
                </UInput>

                <UTabs
                  v-if="currencyItems.length > 1"
                  v-model="state.currency"
                  :items="currencyItems"
                  :content="false"
                  color="primary"
                  variant="pill"
                  class="shrink-0"
                  :ui="{ trigger: 'font-mono', label: 'font-semibold' }"
                />
              </div>

              <p class="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                <UIcon name="i-lucide-info" class="size-3.5 text-primary" />
                {{ ledgerNote }}
              </p>
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Day of month" name="dayOfMonth" required>
                <UPopover>
                  <UButton
                    icon="i-lucide-calendar"
                    :label="dayOrdinal(state.dayOfMonth ?? 1)"
                    color="neutral"
                    variant="outline"
                    class="w-full"
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

              <UFormField label="Paid by" name="paidByMembershipId" required>
                <USelect
                  v-model="state.paidByMembershipId"
                  :items="memberItems"
                  :avatar="{
                    src: selectedPayer?.avatarUrl || undefined,
                    text: selectedPayer ? payerInitials(memberName(selectedPayer)) : '',
                    loading: 'lazy',
                    size: '2xs',
                  }"
                />
              </UFormField>
            </div>

            <UFormField
              label="Active"
              name="isActive"
              description="Paused templates stop auto-posting."
              orientation="horizontal"
            >
              <USwitch v-model="state.isActive" />
            </UFormField>

            <UFormField
              v-if="canSyncCurrentEntry"
              label="Update this month's entry too"
              name="syncCurrentEntry"
              description="Also update the bill already posted this month."
              orientation="horizontal"
            >
              <USwitch v-model="state.syncCurrentEntry" />
            </UFormField>

            <UFormField>
              <div class="space-y-2 rounded-md border border-default bg-muted/50 p-2">
                <div class="flex items-center justify-between gap-2 border-b border-default pb-2.5">
                  <p
                    class="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-toned uppercase"
                  >
                    <UIcon name="i-lucide-users" class="size-3.5" />
                    Split with roommates
                  </p>
                  <UButton
                    :label="equalLabel"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :disabled="!weights.length"
                    @click="equalSplit"
                  />
                </div>

                <p v-if="members.length === 0" class="text-sm text-muted">No members yet.</p>
                <ul v-else class="space-y-1">
                  <li
                    v-for="member in members"
                    :key="member.id"
                    class="flex items-center justify-between gap-2 rounded-lg border border-default bg-default px-3.5 py-1.5"
                  >
                    <div class="flex min-w-0 items-center gap-2.5">
                      <UCheckbox
                        :model-value="isAttendee(member.id)"
                        @update:model-value="setIncluded(member.id, $event)"
                      />
                      <UAvatar
                        :src="member.avatarUrl || undefined"
                        :text="payerInitials(memberName(member))"
                        size="xs"
                        :ui="avatarTheme(isYou(member))"
                      />
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-highlighted">
                          {{ memberName(member) }}
                          <span v-if="isYou(member)" class="font-mono font-normal text-dimmed">
                            (You)
                          </span>
                        </p>
                        <p class="font-mono text-muted">
                          {{ shareText(member.id, isAttendee(member.id)) }}
                        </p>
                      </div>
                    </div>

                    <div class="flex shrink-0 items-center gap-1">
                      <UInput
                        type="number"
                        :model-value="weightPercent(member.id)"
                        :disabled="!isAttendee(member.id)"
                        :ui="{ root: 'w-20', base: 'text-center font-mono font-bold' }"
                        @update:model-value="setPercent(member.id, $event)"
                      />
                      <span class="font-mono text-xs text-dimmed">%</span>
                    </div>
                  </li>
                </ul>

                <div class="flex items-center justify-between gap-2 pt-0.5 sm:justify-center">
                  <span class="font-mono text-xs text-muted sm:hidden">Allocation status</span>
                  <UBadge
                    :color="shareState.color"
                    :icon="shareState.icon"
                    :label="shareState.label"
                    variant="subtle"
                    class="rounded-full"
                  />
                </div>
              </div>
            </UFormField>
          </template>
        </UForm>
      </UTheme>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <UButton
          label="Cancel & Discard"
          color="neutral"
          variant="ghost"
          class="order-2 justify-center md:order-1"
          @click="close"
        />
        <UButton
          type="submit"
          form="category-form"
          :label="saveLabel"
          trailing-icon="i-lucide-check"
          :loading="submitting"
          class="order-1 justify-center md:order-2"
        />
      </div>
    </template>
  </Panel>
</template>
