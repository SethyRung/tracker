<script setup lang="ts">
import type { ContextMenuItem, DropdownMenuItem, TableColumn } from "@nuxt/ui";

useHead({ title: "Categories · Tricker" });

const { roomId } = useScopedRoom();
const { currentRoom, currentRole, status: membershipStatus } = useRoomMemberships();
const route = useRoute();
const toast = useToast();
const currentMonth = monthKey();
const monthLabel = toDayJS(currentMonth, "YYYY-MM").format("MMM YYYY");

const filters = reactive({ type: "all", search: "" });

function money(amountMinor: number, currency: Currency) {
  return formatMoney({ amount_minor: amountMinor, currency });
}

function totalsLabel(entries: Array<{ currency: Currency; amountMinor: number }>) {
  const totals = new Map<Currency, number>();
  for (const entry of entries) {
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amountMinor);
  }
  return [...totals.entries()].map(([currency, amount]) => money(amount, currency)).join(" · ");
}

const {
  data: categoriesData,
  pending,
  status,
  refresh: refreshCategories,
} = useLazyFetch(() => `/api/rooms/${roomId.value}/categories`);
const { data: overviewData, refresh: refreshOverview } = useLazyFetch(
  () => `/api/rooms/${roomId.value}/overview`,
  { query: { month: currentMonth } },
);

const typeMeta = {
  unlimited: { label: "Unlimited", color: "neutral" as const },
  once: { label: "Once / mo", color: "warning" as const },
  recurring: { label: "Recurring", color: "success" as const },
};
const typeRank = { recurring: 0, once: 1, unlimited: 2 } as const;

function nextRun(dayOfMonth: number, postedThisMonth: boolean) {
  const today = now();
  let cursor = today.startOf("month");
  if (postedThisMonth || today.date() > dayOfMonth) cursor = cursor.add(1, "month");
  return cursor.date(Math.min(dayOfMonth, cursor.daysInMonth())).format("MMM DD, YYYY");
}

const directory = computed(() => {
  const categories = categoriesData.value?.data;
  if (!categories) return;

  const overview = overviewData.value?.data;
  const members = overview?.members ?? [];
  const memberById = new Map(members.map((member) => [member.id, member]));
  const memberName = (id: string) => {
    const member = memberById.get(id);
    return member ? member.nickname || member.userName || "Roommate" : "Former roommate";
  };
  const monthEntries = overview?.entries ?? [];

  const rows = categories
    .map((category) => {
      const template = category.template ?? null;
      const published = monthEntries.filter(
        (entry) => entry.categoryId === category.id && entry.status === "published",
      );
      const drafts = monthEntries.filter(
        (entry) => entry.categoryId === category.id && entry.status === "draft",
      );
      const posted =
        published.find((entry) => entry.id === category.currentEntryId) ??
        published.find((entry) => template && entry.templateId === template.id);
      const snapshot = template?.memberSnapshot ?? [];
      const split = snapshot.length ? splitLabel(snapshot, memberName) : "Set on each bill";
      const splitSummary =
        snapshot.length === 2
          ? `${snapshot.map((weight) => Math.round(weight.weightBps / 100)).join("/")} split`
          : split;

      let policy = "Log anytime";
      let policyDetail = "Split is set on each bill";
      let monthTitle = published.length
        ? `${published.length} bill${published.length === 1 ? "" : "s"}`
        : "No bills";
      let monthDetail = published.length ? totalsLabel(published) : undefined;
      let monthColor: "success" | "warning" | "neutral" = "neutral";
      let monthIcon: string | undefined;

      if (category.recurringType === "recurring") {
        policy = template ? `Auto-posts on the ${dayOrdinal(template.dayOfMonth)}` : "No template";
        policyDetail = template
          ? [
              money(template.amountMinor, template.currency),
              template.paidByMembershipId
                ? memberName(template.paidByMembershipId)
                : "Payer not set",
              snapshot.length ? splitSummary : "",
              template.isActive ? "" : "Paused",
            ]
              .filter(Boolean)
              .join(" · ")
          : "Add an amount and split to auto-post";
        if (posted) {
          monthTitle = `Posted ${toDayJS(String(posted.date)).tz(PHNOM_PENH_TZ).format("MMM DD")}`;
          monthDetail = template ? `Next ${nextRun(template.dayOfMonth, true)}` : undefined;
          monthColor = "success";
          monthIcon = "i-lucide-circle-check";
        } else if (template && !template.isActive) {
          monthTitle = "Paused";
          monthDetail = "Will not auto-post";
          monthColor = "warning";
          monthIcon = "i-lucide-circle-pause";
        } else if (template) {
          monthTitle = "Not posted";
          monthDetail = `Next ${nextRun(template.dayOfMonth, false)}`;
        } else {
          monthTitle = "No template";
          monthDetail = undefined;
          monthColor = "warning";
        }
      } else if (category.recurringType === "once") {
        policy = "One bill per month";
        policyDetail = published.length ? "Locked for new entries" : "Open for one bill";
        const logged = published[0];
        if (logged) {
          monthTitle = entryTitle(logged.notes, category.name);
          monthDetail = money(logged.amountMinor, logged.currency);
        } else if (drafts.length) {
          monthTitle = "Draft";
          monthDetail = "Not published";
          monthColor = "warning";
        } else {
          monthTitle = "Open";
          monthDetail = "No bill yet";
        }
      }

      return {
        ...category,
        template,
        icon: categoryIcon(category.name),
        subtitle:
          category.recurringType === "recurring"
            ? "Auto-posted each month"
            : category.recurringType === "once"
              ? "One bill per month"
              : "Any number of bills",
        policy,
        policyDetail,
        split,
        splitSummary,
        monthTitle,
        monthDetail,
        monthColor,
        monthIcon,
      };
    })
    .sort(
      (a, b) =>
        typeRank[a.recurringType] - typeRank[b.recurringType] ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name),
    );

  const active = rows.filter((row) => row.recurringType === "recurring" && row.template?.isActive);
  const paused = rows.filter(
    (row) => row.recurringType === "recurring" && row.template && !row.template.isActive,
  );
  const once = rows.filter((row) => row.recurringType === "once");
  const firstActive = active[0];

  return {
    members,
    rows,
    active: active.length,
    paused: paused.length,
    once: once.length,
    activeDetail: firstActive?.template
      ? `${firstActive.name} · ${money(firstActive.template.amountMinor, firstActive.template.currency)} / mo`
      : "No active templates",
    onceDetail:
      once.length === 0
        ? "No once-a-month rules"
        : once.length === 1
          ? `${once[0]!.name} single-entry rule`
          : `${once.length} single-entry rules`,
    filterItems: [
      { label: "All", value: "all" },
      {
        label: "Recurring",
        value: "recurring",
      },
      { label: "Once / mo", value: "once" },
      {
        label: "Unlimited",
        value: "unlimited",
      },
    ],
  };
});

type CategoryRow = NonNullable<typeof directory.value>["rows"][number];

const permissions = computed(() => ({ isAdmin: currentRole.value === "admin" }));

const visible = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const rows = (directory.value?.rows ?? []).filter(
    (row) =>
      (filters.type === "all" || row.recurringType === filters.type) &&
      (!search || row.name.toLowerCase().includes(search)),
  );
  const total = directory.value?.rows.length ?? 0;
  return {
    rows,
    summary:
      rows.length === total
        ? `${total} categor${total === 1 ? "y" : "ies"}`
        : `Showing ${rows.length} of ${total}`,
  };
});

const interaction = shallowReactive({
  editing: null as CategoryRow | null,
  formOpen: false,
  categoryToRemove: null as CategoryRow | null,
  get removeOpen(): boolean {
    return this.categoryToRemove !== null;
  },
  set removeOpen(open: boolean) {
    if (!open) this.categoryToRemove = null;
  },
});

function openEdit(category: CategoryRow) {
  if (!permissions.value.isAdmin) return;
  interaction.editing = category;
  interaction.formOpen = true;
}

function openCreate() {
  if (!permissions.value.isAdmin) return;
  interaction.editing = null;
  interaction.formOpen = true;
}

function clearFilters() {
  Object.assign(filters, { type: "all", search: "" });
}

watch(roomId, () => {
  clearFilters();
  interaction.formOpen = false;
  interaction.categoryToRemove = null;
});

watch(
  () => interaction.formOpen,
  (open) => {
    if (!open) interaction.editing = null;
  },
);

watch(
  [() => route.query.edit, directory, status, membershipStatus],
  () => {
    if (status.value !== "success" || !directory.value) return;
    const editId = route.query.edit;
    if (typeof editId !== "string" || !editId) return;
    if (membershipStatus.value === "pending") return;
    const category = directory.value.rows.find((row) => row.id === editId);
    if (category) openEdit(category);
    const { edit: _edit, ...query } = route.query;
    void navigateTo({ path: route.path, query }, { replace: true });
  },
  { immediate: true },
);

watch(
  () => status.value === "error" || (status.value === "success" && !directory.value),
  (failed) => {
    if (!failed || import.meta.server) return;
    toast.add({
      title: "Could not load categories",
      description: "Your room data is unavailable. Please try again.",
      duration: 0,
      color: "error",
      icon: "i-lucide-circle-alert",
      actions: [
        {
          label: "Try again",
          color: "error",
          variant: "outline",
          onClick: () => refreshCategories(),
        },
      ],
    });
  },
  { immediate: true },
);

async function refreshAll() {
  await Promise.all([refreshCategories(), refreshOverview()]);
}

async function onRemoveCategory(close: () => void) {
  const category = interaction.categoryToRemove;
  if (!category || !permissions.value.isAdmin) return;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/categories/${category.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    close();
    await refreshAll();
    toast.add({ icon: "i-lucide-circle-check", title: "Category removed", color: "success" });
  } catch (error) {
    toast.add({
      title: "Could not remove category",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

function categoryActions(row: CategoryRow): DropdownMenuItem[] {
  if (!permissions.value.isAdmin) return [];
  return [
    { label: "Edit", icon: "i-lucide-pencil", onSelect: () => openEdit(row) },
    {
      label: "Remove",
      icon: "i-lucide-trash",
      color: "error",
      onSelect: () => {
        interaction.categoryToRemove = row;
      },
    },
  ];
}

function contextActions(row: CategoryRow): ContextMenuItem[] {
  return categoryActions(row) as ContextMenuItem[];
}

const columns: TableColumn<CategoryRow>[] = [
  { id: "name", header: "Category" },
  { id: "rule", header: "Posting rule" },
  { id: "policy", header: "Schedule / cap" },
  { id: "split", header: "Default split" },
  { id: "month", header: monthLabel },
  { id: "actions", header: "Actions", meta: { class: { th: "sr-only", td: "text-right" } } },
];
</script>

<template>
  <UContainer class="max-w-6xl space-y-5">
    <div
      class="flex flex-col justify-between gap-4 border-b border-default pb-5 lg:flex-row lg:items-end"
    >
      <div class="min-w-0 space-y-1.5">
        <p class="flex items-center gap-2 font-mono text-xs tracking-wider text-muted uppercase">
          Expense rules <span>·</span>
          <span class="truncate normal-case">{{ currentRoom?.name }}</span>
        </p>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Categories</h1>
        <p class="max-w-lg text-sm text-muted">
          How bills are scheduled, capped, or auto-posted. Splits on one-off bills are set per
          entry.
        </p>
      </div>

      <UButton
        v-if="permissions.isAdmin"
        icon="i-lucide-plus"
        label="Add category"
        class="hidden lg:inline-flex"
        @click="openCreate"
      />
    </div>

    <div v-if="pending" class="space-y-5" role="status">
      <USkeleton class="h-10 w-full rounded-lg sm:w-96" />
      <USkeleton class="h-80 rounded-lg" />
      <div class="hidden grid-cols-3 gap-4 lg:grid">
        <USkeleton v-for="i in 3" :key="i" class="h-24 rounded-lg" />
      </div>
    </div>

    <template v-else-if="directory">
      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <UTabs
          v-model="filters.type"
          :items="directory.filterItems"
          :content="false"
          color="neutral"
          size="sm"
          :ui="{ root: 'w-full sm:w-auto', trailingBadge: 'font-mono' }"
        />

        <div class="flex items-center gap-2">
          <UInput
            v-model="filters.search"
            icon="i-lucide-search"
            placeholder="Search categories…"
            class="flex-1 sm:w-56"
          />
          <UButton
            v-if="permissions.isAdmin"
            icon="i-lucide-plus"
            label="Add"
            class="lg:hidden"
            @click="openCreate"
          />
        </div>
      </div>

      <UCard
        :ui="{
          body: 'p-0 sm:p-0',
          footer:
            'bg-muted/50 px-4 py-3 sm:px-5 flex flex-col justify-between gap-3 text-xs text-muted sm:flex-row sm:items-center',
        }"
      >
        <div v-if="!visible.rows.length" class="space-y-3 px-4 py-14 text-center">
          <UIcon name="i-lucide-shapes" class="size-9 text-dimmed" />
          <h2 class="text-sm font-semibold text-highlighted">
            {{ directory.rows.length ? "No matching categories" : "No categories yet" }}
          </h2>
          <p class="text-sm text-muted">
            {{
              directory.rows.length
                ? "Try another rule or clear the search."
                : "Add a category to organise bills in this room."
            }}
          </p>
          <UButton
            v-if="directory.rows.length"
            label="Clear filters"
            color="neutral"
            variant="outline"
            @click="clearFilters"
          />
          <UButton
            v-else-if="permissions.isAdmin"
            icon="i-lucide-plus"
            label="Add category"
            @click="openCreate"
          />
        </div>

        <template v-else>
          <ul class="divide-y divide-default lg:hidden">
            <UContextMenu v-for="row in visible.rows" :key="row.id" :items="contextActions(row)">
              <li class="flex items-start gap-2.5 px-3 py-4 sm:px-5">
                <div
                  class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
                >
                  <UIcon :name="row.icon" class="size-4" />
                </div>
                <div class="min-w-0 flex-1 space-y-1">
                  <component
                    :is="permissions.isAdmin ? 'button' : 'p'"
                    type="button"
                    class="block w-full truncate text-left text-sm font-semibold text-highlighted"
                    :class="{
                      'cursor-pointer hover:underline focus-visible:outline-primary':
                        permissions.isAdmin,
                    }"
                    @click="permissions.isAdmin && openEdit(row)"
                  >
                    {{ row.name }}
                  </component>
                  <p class="truncate text-xs text-muted">{{ row.policy }}</p>
                  <p class="truncate font-mono text-xs text-dimmed">{{ row.policyDetail }}</p>
                </div>
                <div class="max-w-28 shrink-0 space-y-1 text-right">
                  <UBadge
                    :label="typeMeta[row.recurringType].label"
                    :color="typeMeta[row.recurringType].color"
                    variant="subtle"
                    size="sm"
                    class="max-w-full"
                    :ui="{ label: 'truncate' }"
                  />
                  <p class="truncate font-mono text-[11px] text-muted">{{ row.monthTitle }}</p>
                </div>
              </li>
            </UContextMenu>
          </ul>

          <UTable
            :data="visible.rows"
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
            <template #name-cell="{ row }">
              <div class="flex items-center gap-3">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
                >
                  <UIcon :name="row.original.icon" class="size-4" />
                </div>
                <div class="min-w-0">
                  <component
                    :is="permissions.isAdmin ? 'button' : 'p'"
                    type="button"
                    class="block max-w-56 truncate text-left font-semibold text-highlighted"
                    :class="{
                      'cursor-pointer hover:underline focus-visible:outline-primary':
                        permissions.isAdmin,
                    }"
                    @click="permissions.isAdmin && openEdit(row.original)"
                  >
                    {{ row.original.name }}
                  </component>
                  <p class="mt-1 text-xs text-dimmed">{{ row.original.subtitle }}</p>
                </div>
              </div>
            </template>

            <template #rule-cell="{ row }">
              <UBadge
                :label="typeMeta[row.original.recurringType].label"
                :color="typeMeta[row.original.recurringType].color"
                variant="subtle"
              />
            </template>

            <template #policy-cell="{ row }">
              <p class="text-sm text-highlighted">{{ row.original.policy }}</p>
              <p class="mt-1 font-mono text-xs text-dimmed">{{ row.original.policyDetail }}</p>
            </template>

            <template #split-cell="{ row }">
              <UBadge
                :label="row.original.splitSummary"
                color="neutral"
                variant="subtle"
                class="max-w-52"
                :ui="{ label: 'truncate' }"
                :title="row.original.split"
              />
            </template>

            <template #month-cell="{ row }">
              <UBadge
                :label="row.original.monthTitle"
                :color="row.original.monthColor"
                :icon="row.original.monthIcon"
                variant="subtle"
                size="sm"
              />
              <p v-if="row.original.monthDetail" class="mt-1 font-mono text-xs text-muted">
                {{ row.original.monthDetail }}
              </p>
            </template>

            <template #actions-cell="{ row }">
              <UDropdownMenu
                v-if="permissions.isAdmin"
                :items="categoryActions(row.original)"
                :content="{ align: 'end' }"
              >
                <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" />
              </UDropdownMenu>
            </template>
          </UTable>
        </template>

        <template #footer>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="size-1.5 rounded-full bg-primary" />
            <span>{{ visible.summary }}</span>
          </div>
          <span class="font-mono">{{ monthLabel }}</span>
        </template>
      </UCard>

      <section class="grid gap-4 lg:grid-cols-3">
        <UCard :ui="{ body: 'flex h-full items-center justify-between gap-3 p-5' }">
          <div class="min-w-0 space-y-1.5">
            <h2 class="font-mono text-xs tracking-wider text-muted uppercase">Configured</h2>
            <p class="font-mono text-2xl font-semibold text-highlighted tabular-nums">
              {{ directory.rows.length }}
            </p>
            <p class="text-xs text-muted">
              {{ directory.paused ? `${directory.paused} paused` : "All active" }}
            </p>
          </div>
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-md border border-default bg-muted text-toned"
          >
            <UIcon name="i-lucide-shapes" class="size-4" />
          </div>
        </UCard>

        <UCard :ui="{ body: 'flex h-full items-center justify-between gap-3 p-5' }">
          <div class="min-w-0 space-y-1.5">
            <h2 class="font-mono text-xs tracking-wider text-muted uppercase">Recurring</h2>
            <p class="font-mono text-2xl font-semibold text-highlighted tabular-nums">
              {{ directory.active }}
            </p>
            <p class="truncate text-xs text-muted">{{ directory.activeDetail }}</p>
          </div>
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-md border border-default bg-muted text-toned"
          >
            <UIcon name="i-lucide-repeat" class="size-4" />
          </div>
        </UCard>

        <UCard :ui="{ body: 'flex h-full items-center justify-between gap-3 p-5' }">
          <div class="min-w-0 space-y-1.5">
            <h2 class="font-mono text-xs tracking-wider text-muted uppercase">Once a month</h2>
            <p class="font-mono text-2xl font-semibold text-highlighted tabular-nums">
              {{ directory.once }}
            </p>
            <p class="truncate text-xs text-muted">{{ directory.onceDetail }}</p>
          </div>
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-md border border-default bg-muted text-toned"
          >
            <UIcon name="i-lucide-shield" class="size-4" />
          </div>
        </UCard>
      </section>

      <CategoryForm
        v-model:open="interaction.formOpen"
        :room-id="roomId"
        :members="directory.members"
        :category="interaction.editing"
        @refresh="refreshAll"
      />
    </template>

    <RemoveModal
      v-model:open="interaction.removeOpen"
      :title="`Remove ${interaction.categoryToRemove?.name ?? 'category'}?`"
      description="Existing entries keep their label, but new entries can't use this category."
      :on-delete="onRemoveCategory"
    />
  </UContainer>
</template>
