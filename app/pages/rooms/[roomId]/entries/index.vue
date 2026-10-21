<script setup lang="ts">
import type { ContextMenuItem, DropdownMenuItem, TableColumn } from "@nuxt/ui";
import { CalendarDate, today } from "@internationalized/date";
import { overviewCsv, summarizeOverviewEntries } from "#shared/utils/overview";

useHead({ title: "Ledger · Tricker" });

const { roomId } = useScopedRoom();
const { currentRoom, currentRole } = useRoomMemberships();
const { user } = useUserSession();
const route = useRoute();
const toast = useToast();
const currentMonth = monthKey();
const month = computed(() => {
  const key = isValidMonthKey(route.query.month) ? (route.query.month as string) : currentMonth;
  return {
    key,
    label: toDayJS(key, "YYYY-MM").format("MMM YYYY"),
  };
});
const maxMonth = today(PHNOM_PENH_TZ);

function toMonthDate(key: string) {
  const [year, monthNumber] = key.split("-").map(Number);
  return new CalendarDate(year!, monthNumber!, 1);
}

const monthDate = computed({
  get: () => toMonthDate(month.value.key),
  set(value) {
    if (!value || !("year" in value) || !("month" in value)) return;
    const key = `${value.year}-${String(value.month).padStart(2, "0")}`;
    if (!isValidMonthKey(key) || key > currentMonth || key === month.value.key) return;
    void navigateTo({ path: route.path, query: { month: key } });
  },
});
const filters = reactive({ currency: "all", categoryId: "all", search: "" });

function money(amountMinor: number, currency: Currency) {
  return formatMoney({ amount_minor: amountMinor, currency });
}

const { data, pending, status, refresh } = useLazyFetch(
  () => `/api/rooms/${roomId.value}/overview`,
  {
    query: () => ({ month: month.value.key }),
  },
);

const ledger = computed(() => {
  const result = data.value?.data;
  if (!result) return;

  const memberById = new Map(result.members.map((member) => [member.id, member]));
  const categoryById = new Map(result.categories.map((category) => [category.id, category]));
  const memberName = (id: string) => {
    const member = memberById.get(id);
    return member ? member.nickname || member.userName || "Roommate" : "Former roommate";
  };
  const entries = result.entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((entry) => {
      const category = entry.categoryId ? categoryById.get(entry.categoryId) : undefined;
      const categoryName = category?.name || "Uncategorized";
      const customSplit = entry.weights.some(
        (weight) => Math.abs(weight.weightBps - entry.weights[0]!.weightBps) > 1,
      );
      const recurring = !!entry.templateId || category?.recurringType === "recurring";
      return {
        ...entry,
        title: entryTitle(entry.notes, categoryName),
        categoryName,
        subtitle: recurring ? "Monthly recurring bill" : categoryName,
        icon: categoryIcon(categoryName),
        payerName: memberName(entry.paidByMembershipId),
        split: splitLabel(entry.weights, memberName),
        splitSummary:
          entry.weights.length === 2
            ? `${entry.weights.map((weight) => weight.weightBps / 100).join("/")} split`
            : entry.weights.length === 1
              ? "1 person"
              : entry.weights.length
                ? `${customSplit ? "Custom" : "Equal"} split · ${entry.weights.length} people`
                : "No split",
        customSplit,
        recurring,
        formattedAmount: money(entry.amountMinor, entry.currency),
        dateFormatted: toDayJS(entry.date).tz(PHNOM_PENH_TZ).format("MMM DD, YYYY"),
        shortDate: toDayJS(entry.date).tz(PHNOM_PENH_TZ).format("MMM D"),
        badge:
          entry.status === "draft"
            ? { label: "Draft", color: "warning" as const }
            : recurring
              ? { label: "Recurring", color: "success" as const }
              : undefined,
      };
    });
  const totals = summarizeOverviewEntries(entries);
  const currentMember = result.members.find((member) => member.userId === user.value?.id);
  const categoryFilterItems = [
    { id: "all", label: "All categories", count: entries.length, icon: undefined },
    ...result.categories.map((category) => ({
      id: category.id,
      label: category.name,
      count: entries.filter((entry) => entry.categoryId === category.id).length,
      icon: categoryIcon(category.name),
    })),
  ];
  const uncategorizedCount = entries.filter(
    (entry) => entry.categoryName === "Uncategorized",
  ).length;
  if (uncategorizedCount > 0) {
    categoryFilterItems.push({
      id: "uncategorized",
      label: "Uncategorized",
      count: uncategorizedCount,
      icon: "i-lucide-tag",
    });
  }

  return {
    members: result.members,
    categories: result.categories,
    entries,
    totals,
    monthClosed: result.snapshot.status === "closed",
    initialDate:
      month.value.key === currentMonth
        ? now().startOf("day").toISOString()
        : monthRange(month.value.key).start.toISOString(),
    blockedCategoryIds: entries.flatMap((entry) =>
      entry.categoryId && entry.status === "published" ? [entry.categoryId] : [],
    ),
    currencyItems: [
      { label: "All entries", value: "all", badge: entries.length },
      { label: "USD", value: "USD", badge: entries.filter((e) => e.currency === "USD").length },
      { label: "KHR", value: "KHR", badge: entries.filter((e) => e.currency === "KHR").length },
    ],
    categoryFilterItems,
    positions: [result.settlement.usd, result.settlement.khr].map((plan) => {
      const balance =
        plan.members.find((member) => member.membershipId === currentMember?.id)?.balance ?? 0;
      return {
        currency: plan.currency,
        balance,
        formatted: `${balance > 0 ? "+" : ""}${money(balance, plan.currency)}`,
        colorClass: balance > 0 ? "text-success" : balance < 0 ? "text-error" : "text-highlighted",
      };
    }),
  };
});
type Entry = NonNullable<typeof ledger.value>["entries"][number];

const permissions = computed(() => ({
  isAdmin: currentRole.value === "admin",
  canAddEntry: !!ledger.value && !ledger.value.monthClosed,
}));

const visible = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const entries = (ledger.value?.entries ?? []).filter(
    (entry) =>
      (filters.currency === "all" || entry.currency === filters.currency) &&
      (filters.categoryId === "all" ||
        entry.categoryId === filters.categoryId ||
        (filters.categoryId === "uncategorized" && entry.categoryName === "Uncategorized")) &&
      (!search ||
        [entry.title, entry.categoryName, entry.payerName, entry.split].some((value) =>
          value.toLowerCase().includes(search),
        )),
  );
  const totals = summarizeOverviewEntries(entries);
  const publishedCount = totals.USD.count + totals.KHR.count;
  const draftCount = entries.filter((entry) => entry.status === "draft").length;
  const published = `${publishedCount} published bill${publishedCount === 1 ? "" : "s"}`;
  const drafts = draftCount
    ? ` · ${draftCount} draft${draftCount === 1 ? "" : "s"} excluded from totals`
    : "";

  return {
    entries,
    footerSummary: published + drafts,
    subtotalUsd: money(totals.USD.amountMinor, "USD"),
    subtotalKhr: money(totals.KHR.amountMinor, "KHR"),
  };
});

const interaction = shallowReactive({
  editing: null as Entry | null,
  formOpen: false,
  publishingId: null as string | null,
  entryToRemove: null as Entry | null,
  get removeOpen(): boolean {
    return this.entryToRemove !== null;
  },
  set removeOpen(open: boolean) {
    if (!open) this.entryToRemove = null;
  },
});

function canEdit(entry: Entry) {
  return (
    permissions.value.canAddEntry &&
    (permissions.value.isAdmin ||
      (entry.status === "published" && entry.createdByUserId === user.value?.id))
  );
}

function editEntry(entry: Entry) {
  if (!canEdit(entry)) return;
  interaction.editing = entry;
  interaction.formOpen = true;
}

function addEntry() {
  if (!permissions.value.canAddEntry) return;
  interaction.editing = null;
  interaction.formOpen = true;
}

function clearFilters() {
  Object.assign(filters, { currency: "all", categoryId: "all", search: "" });
}

function exportCsv() {
  if (status.value !== "success" || !visible.value.entries.length) return;
  const csv = overviewCsv(
    visible.value.entries.map((entry) => ({
      ...entry,
      description: entry.title,
      category: entry.categoryName,
      paidBy: entry.payerName,
    })),
  );
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tricker-ledger-${roomId.value}-${month.value.key}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

watch([roomId, () => month.value.key], () => {
  clearFilters();
  interaction.formOpen = false;
  interaction.entryToRemove = null;
});

watch(
  () => interaction.formOpen,
  (open) => {
    if (!open) interaction.editing = null;
  },
);

watch(
  [() => route.query.new, () => route.query.edit, ledger, status],
  () => {
    if (status.value !== "success" || !ledger.value) return;
    const editId = route.query.edit;
    if (route.query.new != null && route.query.new !== "false") {
      addEntry();
    } else if (typeof editId === "string") {
      const entry = ledger.value.entries.find((entry) => entry.id === editId);
      if (!entry) return;
      editEntry(entry);
    } else {
      return;
    }
    const { new: _new, edit: _edit, ...query } = route.query;
    void navigateTo({ path: route.path, query }, { replace: true });
  },
  { immediate: true },
);

watch(
  () => status.value === "error" || (status.value === "success" && !ledger.value),
  (failed) => {
    if (!failed || import.meta.server) return;
    toast.add({
      title: "Could not load ledger",
      description: "Your room data is unavailable. Please try again.",
      duration: 0,
      color: "error",
      icon: "i-lucide-circle-alert",
      actions: [
        { label: "Try again", color: "error", variant: "outline", onClick: () => refresh() },
      ],
    });
  },
  { immediate: true },
);

async function onRemoveEntry(close: () => void) {
  const entry = interaction.entryToRemove;
  if (!entry || !canEdit(entry)) return;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    close();
    await refresh();
    toast.add({ icon: "i-lucide-circle-check", title: "Bill deleted", color: "success" });
  } catch (error) {
    toast.add({
      title: "Could not delete bill",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

async function onPublish(entry: Entry) {
  if (
    interaction.publishingId ||
    !canEdit(entry) ||
    !permissions.value.isAdmin ||
    entry.status !== "draft"
  )
    return;
  interaction.publishingId = entry.id;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.id}/publish`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await refresh();
    toast.add({ icon: "i-lucide-circle-check", title: "Bill published", color: "success" });
  } catch (error) {
    toast.add({
      title: "Could not publish bill",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  } finally {
    interaction.publishingId = null;
  }
}

function entryActions(entry: Entry): DropdownMenuItem[] {
  const items: DropdownMenuItem[] = [];
  if (canEdit(entry)) {
    if (permissions.value.isAdmin && entry.status === "draft") {
      items.push({
        label: "Publish bill",
        icon: "i-lucide-send",
        onSelect: () => onPublish(entry),
      });
    }
    items.push({ label: "Edit bill", icon: "i-lucide-pencil", onSelect: () => editEntry(entry) });
    if (entry.recurring && permissions.value.isAdmin) {
      items.push({
        label: "Edit template",
        icon: "i-lucide-repeat-2",
        onSelect: () =>
          navigateTo(
            entry.categoryId
              ? `/rooms/${roomId.value}/categories?edit=${entry.categoryId}`
              : `/rooms/${roomId.value}/categories`,
          ),
      });
    }
    items.push({
      label: "Delete bill",
      icon: "i-lucide-trash",
      color: "error",
      onSelect: () => {
        interaction.entryToRemove = entry;
      },
    });
  }
  return items;
}

function contextActions(entry: Entry): ContextMenuItem[] {
  return entryActions(entry) as ContextMenuItem[];
}

const columns: TableColumn<Entry>[] = [
  { accessorKey: "title", header: "Description" },
  { accessorKey: "categoryName", header: "Category" },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => row.original.dateFormatted,
    meta: { class: { td: "font-mono text-xs whitespace-nowrap" } },
  },
  { accessorKey: "payerName", header: "Paid by" },
  { accessorKey: "split", header: "Split breakdown" },
  {
    id: "amount",
    header: "Amount",
    meta: { class: { th: "text-right", td: "text-right" } },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { class: { th: "sr-only", td: "text-right" } },
  },
];
</script>

<template>
  <UContainer class="max-w-6xl space-y-5">
    <div
      class="flex flex-col justify-between gap-4 border-b border-default pb-5 lg:flex-row lg:items-end"
    >
      <div class="min-w-0 space-y-1.5">
        <p class="flex items-center gap-2 font-mono text-xs tracking-wider text-muted uppercase">
          Room ledger <span>·</span>
          <span class="truncate normal-case">{{ currentRoom?.name }}</span>
        </p>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
          Household Ledger
        </h1>
        <p class="max-w-lg text-sm text-muted">
          All shared expenses. Parallel USD and KHR ledgers, with no conversion.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UPopover>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-calendar"
            :label="month.label"
            :disabled="status === 'pending'"
            :ui="{ base: 'min-w-48', label: 'font-mono' }"
          />

          <template #content="{ close }">
            <UCalendar
              v-model="monthDate"
              type="month"
              prevent-deselect
              :max-value="maxMonth"
              class="p-2"
              @update:model-value="close"
            />
          </template>
        </UPopover>

        <UButton
          class="hidden lg:inline-flex"
          icon="i-lucide-plus"
          label="Add bill"
          :disabled="!permissions.canAddEntry"
          @click="addEntry"
        />
      </div>
    </div>

    <div v-if="pending" class="space-y-5" role="status">
      <USkeleton class="h-10 w-full rounded-lg sm:w-96" />
      <USkeleton class="h-80 rounded-lg" />
      <div class="hidden grid-cols-3 gap-4 lg:grid">
        <USkeleton v-for="i in 3" :key="i" class="h-32 rounded-lg" />
      </div>
    </div>

    <template v-else-if="ledger">
      <UAlert
        v-if="ledger.monthClosed"
        color="neutral"
        variant="subtle"
        icon="i-lucide-lock"
        title="This month is read-only"
        :description="
          permissions.isAdmin
            ? 'Reopen the month from settlement to make changes.'
            : 'Ask a room admin to reopen the month to make changes.'
        "
        :actions="[
          {
            label: 'View settlement',
            to: `/rooms/${roomId}/settle/${month.key}`,
            color: 'neutral',
            variant: 'outline',
          },
        ]"
      />

      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <UTabs
          v-model="filters.currency"
          :items="ledger.currencyItems"
          :content="false"
          color="neutral"
          size="sm"
          :ui="{
            root: 'w-full sm:w-auto',
            trailingBadge: 'font-mono',
          }"
        />

        <div class="flex items-center gap-2">
          <UInput
            v-model="filters.search"
            icon="i-lucide-search"
            placeholder="Search entries…"
            class="flex-1 sm:w-56"
          />

          <UButton
            icon="i-lucide-download"
            label="Export CSV"
            color="neutral"
            variant="outline"
            :disabled="!visible.entries.length"
            @click="exportCsv"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 overflow-x-auto py-1">
        <UButton
          v-for="item in ledger.categoryFilterItems"
          :key="item.id"
          :icon="item.icon"
          :label="item.label"
          color="neutral"
          :variant="filters.categoryId === item.id ? 'solid' : 'outline'"
          size="sm"
          class="rounded-full"
          @click="filters.categoryId = item.id"
        />
      </div>

      <UCard
        :ui="{
          body: 'p-0 sm:p-0',
          footer:
            'bg-muted/50 px-4 py-3 sm:px-5 flex flex-col justify-between gap-3 text-xs text-muted sm:flex-row sm:items-center',
        }"
      >
        <div v-if="!visible.entries.length" class="space-y-3 px-4 py-14 text-center">
          <UIcon name="i-lucide-receipt-text" class="size-9 text-dimmed" />
          <h2 class="text-sm font-semibold text-highlighted">
            {{ ledger.entries.length ? "No matching bills" : "No bills this month" }}
          </h2>
          <p class="text-sm text-muted">
            {{
              ledger.entries.length
                ? "Try another category, currency, or search."
                : ledger.monthClosed
                  ? "There are no bills in this closed month."
                  : "Add your first shared expense to get started."
            }}
          </p>
          <UButton
            v-if="ledger.entries.length"
            label="Clear filters"
            color="neutral"
            variant="outline"
            @click="clearFilters"
          />
          <UButton
            v-else-if="!ledger.monthClosed"
            label="Add a bill"
            icon="i-lucide-plus"
            @click="addEntry"
          />
        </div>

        <template v-else>
          <ul class="divide-y divide-default lg:hidden">
            <UContextMenu
              v-for="entry in visible.entries"
              :key="entry.id"
              :items="contextActions(entry)"
            >
              <li class="flex items-start gap-2.5 px-3 py-4 sm:px-5">
                <div
                  class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
                >
                  <UIcon :name="entry.icon" class="size-4" />
                </div>
                <div class="min-w-0 flex-1 space-y-1">
                  <component
                    :is="canEdit(entry) ? 'button' : 'p'"
                    type="button"
                    class="block w-full truncate text-left text-sm font-semibold text-highlighted"
                    :class="{
                      'cursor-pointer hover:underline focus-visible:outline-primary':
                        canEdit(entry),
                    }"
                    @click="canEdit(entry) && editEntry(entry)"
                  >
                    {{ entry.title }}
                  </component>
                  <p class="truncate text-xs text-muted">
                    {{ entry.shortDate }} · {{ entry.payerName }}
                  </p>
                  <p
                    class="truncate font-mono text-xs"
                    :class="entry.customSplit ? 'text-warning' : 'text-dimmed'"
                    :title="entry.split"
                  >
                    {{ entry.splitSummary }}
                  </p>
                </div>

                <div class="max-w-28 shrink-0 space-y-1 text-right">
                  <p
                    class="font-mono text-sm font-semibold break-all text-highlighted tabular-nums"
                  >
                    {{ entry.formattedAmount }}
                  </p>

                  <UBadge
                    :label="entry.badge?.label ?? entry.categoryName"
                    :color="entry.badge?.color ?? 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="max-w-full"
                    :ui="{ label: 'truncate' }"
                  />
                </div>
              </li>
            </UContextMenu>
          </ul>

          <UTable
            :data="visible.entries"
            :columns="columns"
            class="hidden lg:block"
            :watch-options="{ deep: false }"
            :ui="{
              base: 'w-full min-w-240',
              thead: 'bg-muted/50',
              th: 'font-mono text-xs tracking-wider uppercase text-muted',
              td: 'py-4',
              tr: 'hover:bg-muted/50',
            }"
          >
            <template #title-cell="{ row }">
              <div class="flex items-center gap-3">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
                >
                  <UIcon :name="row.original.icon" class="size-4" />
                </div>
                <div class="min-w-0">
                  <component
                    :is="canEdit(row.original) ? 'button' : 'p'"
                    type="button"
                    class="block max-w-56 truncate text-left font-semibold text-highlighted"
                    :class="{
                      'cursor-pointer hover:underline focus-visible:outline-primary': canEdit(
                        row.original,
                      ),
                    }"
                    @click="canEdit(row.original) && editEntry(row.original)"
                  >
                    {{ row.original.title }}
                  </component>
                  <p class="mt-1 text-xs text-dimmed">
                    {{ row.original.subtitle }}
                  </p>
                </div>
              </div>
            </template>

            <template #categoryName-cell="{ row }">
              <UBadge
                :label="row.original.categoryName"
                :icon="row.original.icon"
                color="neutral"
                variant="subtle"
              />
            </template>

            <template #payerName-cell="{ row }">
              <div class="flex items-center gap-2">
                <UAvatar :alt="row.original.payerName" size="2xs" color="neutral" />
                <span class="text-xs text-toned">{{ row.original.payerName }}</span>
              </div>
            </template>

            <template #split-cell="{ row }">
              <UBadge
                :label="row.original.splitSummary"
                :color="row.original.customSplit ? 'warning' : 'neutral'"
                variant="subtle"
                class="max-w-52"
                :ui="{ label: 'truncate' }"
                :title="row.original.split"
              />
            </template>

            <template #amount-cell="{ row }">
              <p class="font-mono font-semibold whitespace-nowrap text-highlighted tabular-nums">
                {{ row.original.formattedAmount }}
              </p>

              <UBadge
                v-if="row.original.badge"
                :label="row.original.badge.label"
                :color="row.original.badge.color"
                variant="subtle"
                size="sm"
                class="mt-1"
              />
            </template>

            <template #actions-cell="{ row }">
              <UDropdownMenu
                v-if="canEdit(row.original)"
                :items="entryActions(row.original)"
                :content="{ align: 'end' }"
              >
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  :loading="interaction.publishingId === row.original.id"
                />
              </UDropdownMenu>
              <UIcon
                v-else-if="ledger.monthClosed"
                name="i-lucide-lock"
                class="size-4 text-dimmed"
              />
            </template>
          </UTable>
        </template>

        <template #footer>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="size-1.5 rounded-full bg-primary" />
            <span>{{ visible.footerSummary }}</span>
          </div>

          <div class="flex flex-wrap gap-x-4 gap-y-1 font-mono tabular-nums">
            <div>
              USD subtotal:
              <strong class="font-semibold text-highlighted">{{ visible.subtotalUsd }}</strong>
            </div>
            <div>
              KHR subtotal:
              <strong class="font-semibold text-highlighted">{{ visible.subtotalKhr }}</strong>
            </div>
          </div>
        </template>
      </UCard>

      <section class="grid gap-4 lg:grid-cols-3">
        <UCard
          v-for="currency in ['USD', 'KHR'] as const"
          :key="currency"
          :ui="{ body: 'flex h-full items-center justify-between gap-3 p-5' }"
        >
          <div class="space-y-1.5">
            <h2 class="font-mono text-xs tracking-wider text-muted uppercase">
              {{ currency }} monthly ledger
            </h2>
            <p class="font-mono text-2xl font-semibold text-highlighted tabular-nums">
              {{ money(ledger.totals[currency].amountMinor, currency) }}
            </p>
            <p class="text-xs text-muted">
              {{ ledger.totals[currency].count }} published expense{{
                ledger.totals[currency].count === 1 ? "" : "s"
              }}
            </p>
          </div>
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-md border border-default bg-muted font-mono text-toned"
          >
            {{ currency === "USD" ? "$" : "៛" }}
          </div>
        </UCard>

        <UCard :ui="{ body: 'space-y-3 p-5' }">
          <h2 class="font-mono text-xs tracking-wider text-muted uppercase">
            Your monthly net position
          </h2>
          <div
            v-for="position in ledger.positions"
            :key="position.currency"
            class="flex items-baseline justify-between gap-2 text-xs"
          >
            <span class="text-muted">{{ position.currency }}</span>
            <span class="font-mono text-lg font-semibold tabular-nums" :class="position.colorClass">
              {{ position.formatted }}
            </span>
          </div>
          <NuxtLink
            :to="`/rooms/${roomId}/settle/${month.key}`"
            class="text-xs text-muted hover:text-highlighted"
          >
            Review settlement →
          </NuxtLink>
        </UCard>
      </section>

      <EntryForm
        v-model:open="interaction.formOpen"
        :room-id="roomId"
        :members="ledger.members"
        :categories="ledger.categories"
        :blocked-category-ids="ledger.blockedCategoryIds"
        :initial-date="ledger.initialDate"
        :entry="interaction.editing"
        @refresh="refresh"
      />
    </template>

    <RemoveModal
      v-model:open="interaction.removeOpen"
      title="Delete this bill?"
      description="This bill and its split will be permanently removed from the room."
      :on-delete="onRemoveEntry"
    />
  </UContainer>
</template>
