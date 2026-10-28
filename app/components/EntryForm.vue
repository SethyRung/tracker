<script setup lang="ts">
import { CalendarDate, parseAbsolute, today } from "@internationalized/date";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { bpsToPercent, equalSplitBps, percentToBps, splitRemainderBps } from "#shared/types/weight";
import type { text } from "drizzle-orm/sqlite-core";

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  userName: string;
  avatarUrl?: string | null;
  joinedAt?: string | Date | null;
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

interface EntryFormProps {
  roomId: string;
  members: Member[];
  categories: Category[];
  blockedCategoryIds?: string[];
  blockedCategoryMonth?: string;
  initialDate?: string;
  entry?: Entry | null;
  loading?: boolean;
  loadError?: boolean;
  monthClosed?: boolean;
}

type Weight = { membershipId: string; weightBps: number };

const props = withDefaults(defineProps<EntryFormProps>(), { blockedCategoryIds: () => [] });
const emit = defineEmits<{ refresh: [] }>();
const open = defineModel<boolean>("open", { default: false });

const toast = useToast();
const { user } = useUserSession();
const { currentRoom } = useRoomMemberships();
const { isMD } = useBreakpoints();

const isEdit = computed(() => !!props.entry?.id);
const isMaterialized = computed(() => !!props.entry?.templateId);
const roomName = computed(() => currentRoom.value?.name ?? "this room");
const memberById = computed(() => new Map(props.members.map((member) => [member.id, member])));

const schema = z.object({
  description: z
    .string("Enter a description")
    .max(500, "Description must be at most 500 characters")
    .optional(),
  amountMajor: z.number("Enter a valid amount").positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "KHR"], "Choose USD or KHR"),
  date: z
    .string("Pick a date")
    .min(1, "Pick a date")
    .refine((d) => !Number.isNaN(new Date(d).getTime()), "Enter a valid date")
    .refine((d) => new Date(d).getTime() <= Date.now(), "Date cannot be in the future"),
  categoryId: z.string("Pick a category").min(1, "Pick a category"),
  paidByMembershipId: z.string("Pick who pays").min(1, "Pick who pays"),
  attendees: z
    .array(z.string("Pick a roommate"), "Pick at least one roommate")
    .min(1, "Pick at least one roommate"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  amountMajor: 0,
  currency: "USD",
  date: new Date().toISOString(),
  attendees: [],
});

const weights = ref<Weight[]>([]);
const hydrating = ref(false);
const submitting = ref(false);
const resetting = ref(false);

function toCalendarDate(iso: string) {
  const zoned = parseAbsolute(iso, PHNOM_PENH_TZ);
  return new CalendarDate(zoned.year, zoned.month, zoned.day);
}

function toDateIso(value: CalendarDate) {
  return value.toDate(PHNOM_PENH_TZ).toISOString();
}

const maxDate = today(PHNOM_PENH_TZ);
const dateValue = computed({
  get: () => (state.date ? toCalendarDate(state.date) : undefined),
  set: (value) => {
    state.date =
      value && "year" in value
        ? toDateIso(new CalendarDate(value.year, value.month, value.day))
        : "";
  },
});

function formatDateLabel(iso?: string) {
  return iso ? toDayJS(iso).format("MMM D, YYYY") : "Pick a date";
}

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
  currencyChoices.value.map((currency) => ({
    label: currency,
    value: currency,
    disabled: isEdit.value,
  })),
);

const activeCurrency = computed<Currency>(() => state.currency ?? "USD");

function defaultCurrency(): Currency {
  return enabledCurrencies.value.includes("USD") ? "USD" : enabledCurrencies.value[0]!;
}

const currencySymbol = computed(() => (activeCurrency.value === "KHR" ? "៛" : "$"));
const amountStep = computed(() => (activeCurrency.value === "KHR" ? 1 : 0.01));
const amountFormat = computed(() =>
  activeCurrency.value === "KHR"
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
);
const ledgerNote = computed(
  () => `Independent ${activeCurrency.value} ledger. Zero currency conversion distortion.`,
);

const displayCategories = computed(() => {
  const blocked = new Set(
    state.date && monthKey(new Date(state.date)) === props.blockedCategoryMonth
      ? props.blockedCategoryIds
      : [],
  );
  return props.categories.filter(
    (category) =>
      category.id === props.entry?.categoryId ||
      (category.recurringType !== "recurring" &&
        !(category.recurringType === "once" && blocked.has(category.id))),
  );
});

watch(displayCategories, (categories) => {
  if (state.categoryId && !categories.some((category) => category.id === state.categoryId)) {
    state.categoryId = undefined;
  }
});

const title = computed(() => (isEdit.value ? "Edit Bill Entry" : "New Bill Entry"));
const description = computed(() =>
  isEdit.value
    ? `Update this bill for ${roomName.value}. Changes apply to this entry only.`
    : `Log a shared expense for ${roomName.value}`,
);

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

const saveLabel = computed(
  () =>
    `Save Bill Entry (${moneyLabel(toAmountMinor(activeCurrency.value, state.amountMajor ?? 0))})`,
);

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
  return state.attendees?.includes(id) ?? false;
}

function zeroWeights(ids: string[]): Weight[] {
  return ids.map((membershipId) => ({ membershipId, weightBps: 0 }));
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

function setIncluded(membershipId: string, value: boolean | "indeterminate") {
  const selected = new Set(state.attendees ?? []);
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
    const ids = props.members.map((member) => member.id);
    state.description = undefined;
    state.amountMajor = 0;
    state.currency = defaultCurrency();
    state.date = props.initialDate ?? toDateIso(today(PHNOM_PENH_TZ));
    state.categoryId = undefined;
    state.paidByMembershipId = defaultPayerId();
    state.attendees = ids;
    weights.value = zeroWeights(ids);
    equalSplit();
  });
}

function populate(entry: Entry) {
  hydrate(() => {
    state.description = entry.notes ?? undefined;
    state.currency = entry.currency as Schema["currency"];
    state.amountMajor = toAmountMajor(entry.currency as Currency, entry.amountMinor);
    state.date = entry.date ? toDateIso(toCalendarDate(new Date(entry.date).toISOString())) : "";
    state.paidByMembershipId = entry.paidByMembershipId;
    state.categoryId = entry.categoryId ?? undefined;
    weights.value = entry.weights.map(({ membershipId, weightBps }) => ({
      membershipId,
      weightBps,
    }));
    state.attendees = weights.value.map((weight) => weight.membershipId);
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
    if (props.entry) populate(props.entry);
    else reset();
  },
  { immediate: true },
);

watch(
  () => props.members,
  (list) => {
    if (!canAutofill()) return;
    if (list.length && !state.attendees?.length) state.attendees = list.map((member) => member.id);
    if (!state.paidByMembershipId) state.paidByMembershipId = defaultPayerId();
  },
);

watch(
  () => props.loading,
  (loading, wasLoading) => {
    if (wasLoading && !loading && open.value && !isEdit.value && !props.loadError) reset();
  },
);

watch(
  [open, () => props.loadError, () => props.monthClosed],
  ([isOpen, loadError, monthClosed]) => {
    if (!isOpen || import.meta.server || (!loadError && !monthClosed)) return;
    open.value = false;
    if (loadError) {
      toast.add({
        title: "Could not load bill form",
        description: "Your room data is unavailable. Please try again.",
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 0,
        actions: [
          {
            label: "Try again",
            onClick: async () => {
              emit("refresh");
              await nextTick();
              open.value = true;
            },
          },
        ],
      });
    } else {
      toast.add({
        title: "This month is closed",
        description: "Bills cannot be added to a closed month.",
        color: "warning",
        icon: "i-lucide-lock",
      });
    }
  },
  { immediate: true },
);

watch(enabledCurrencies, (items) => {
  if (!canAutofill() || (state.currency && items.includes(state.currency))) return;
  state.currency = defaultCurrency();
});

function showError(error: unknown, fallback: string) {
  toast.add({
    icon: "i-lucide-circle-x",
    title: "Error",
    description: getErrorMessage(error, fallback),
  });
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.roomId || submitting.value || props.loading || props.loadError || props.monthClosed)
    return;
  if (!shareState.value.valid) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Shares must total 100%",
      description: shareState.value.message,
    });
    return;
  }

  const { data } = event;
  const payload = {
    categoryId: data.categoryId || null,
    amountMinor: toAmountMinor(data.currency, data.amountMajor),
    date: data.date,
    paidByMembershipId: data.paidByMembershipId,
    notes: data.description || null,
    weights: weights.value.map(({ membershipId, weightBps }) => ({ membershipId, weightBps })),
  };

  submitting.value = true;
  try {
    const entry = props.entry;
    const editing = !!entry && isEdit.value;
    const res = await $fetch<ApiResponse<unknown>>(
      editing
        ? `/api/rooms/${props.roomId}/entries/${entry.id}`
        : `/api/rooms/${props.roomId}/entries`,
      {
        method: editing ? "PATCH" : "POST",
        body: editing ? payload : { ...payload, currency: data.currency },
      },
    );
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    open.value = false;
    toast.add({
      icon: "i-lucide-circle-check",
      title: editing ? "Entry updated" : "Entry created",
    });
    emit("refresh");
  } catch (error) {
    showError(error, "Could not save entry.");
  } finally {
    submitting.value = false;
  }
}

async function resetToTemplate() {
  const entry = props.entry;
  if (!entry?.id || !entry.templateId || resetting.value) return;
  resetting.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/entries/${entry.id}/reset-to-template`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    populate(res.data);
    toast.add({ icon: "i-lucide-rotate-ccw", title: "Reset to template" });
    emit("refresh");
  } catch (error) {
    showError(error, "Could not reset entry.");
  } finally {
    resetting.value = false;
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
      <div v-if="loading" class="space-y-5" role="status" aria-label="Loading bill form">
        <USkeleton v-for="index in 4" :key="index" class="h-14 rounded-lg" />
      </div>
      <UTheme
        v-else-if="!loadError && !monthClosed"
        :props="{
          button: {
            size: 'lg',
          },
          formField: {
            ui: {
              label: 'font-mono text-xs font-semibold tracking-wider text-muted uppercase',
            },
          },
          input: {
            size: 'lg',
            ui: { root: 'w-full' },
          },
          select: {
            size: 'lg',
            ui: {
              base: 'w-full',
            },
          },
          tabs: {
            size: 'lg',
          },
          textarea: {
            size: 'lg',
            ui: {
              root: 'w-full',
            },
          },
        }"
      >
        <UForm id="entry-form" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
          <UAlert
            v-if="isMaterialized"
            icon="i-lucide-repeat"
            title="Auto-posted from a recurring template"
            description="Your edits apply to this entry only and won't change the template. Future months keep using the template."
            variant="subtle"
            :actions="[
              {
                icon: 'i-lucide-rotate-ccw',
                label: 'Reset to template',
                variant: 'soft',
                loading: resetting,
                onClick: resetToTemplate,
              },
            ]"
          />

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

          <UFormField label="Description" name="description" hint="Optional">
            <UTextarea v-model="state.description" placeholder="What was this expense for?" />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Date" name="date" required>
              <UPopover>
                <UButton
                  icon="i-lucide-calendar"
                  :label="formatDateLabel(state.date)"
                  color="neutral"
                  variant="outline"
                  class="w-full"
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
                :items="memberItems"
                :avatar="{
                  src: selectedPayer?.avatarUrl || undefined,
                  text: selectedPayer ? payerInitials(memberName(selectedPayer)) : '',
                  loading: 'lazy',
                  size: '2xs',
                }"
              >
              </USelect>
            </UFormField>
          </div>

          <UFormField label="Category" name="categoryId" required>
            <p v-if="!displayCategories.length" class="text-sm text-muted">
              {{ categories.length ? "No categories available." : "No categories yet." }}
              Recurring ones are managed on the
              <NuxtLink :to="`/rooms/${roomId}/categories`" class="text-primary underline">
                categories
              </NuxtLink>
              page. Once-a-month categories can be logged once per month.
            </p>
            <div v-else class="flex gap-2 overflow-x-auto pt-0.5">
              <UButton
                v-for="category in displayCategories"
                :key="category.id"
                :icon="categoryIcon(category.name)"
                :label="category.name"
                size="sm"
                class="shrink-0 rounded-full"
                :color="state.categoryId === category.id ? 'primary' : 'neutral'"
                :variant="state.categoryId === category.id ? 'soft' : 'outline'"
                @click="state.categoryId = category.id"
              />
            </div>
          </UFormField>

          <UFormField name="attendees">
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
                  <div class="flex items-center gap-2.5">
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

                    <div>
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
          v-if="!loading && !loadError && !monthClosed"
          type="submit"
          form="entry-form"
          :label="saveLabel"
          trailing-icon="i-lucide-check"
          :loading="submitting"
          class="order-1 justify-center md:order-2"
        />
      </div>
    </template>
  </Panel>
</template>
