<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem, TableColumn, TabsItem } from "@nuxt/ui";

const mockNavItems: NavigationMenuItem[] = [
  { label: "Home", icon: "i-lucide-house", active: true },
  { label: "People", icon: "i-lucide-users" },
  { label: "Settle", icon: "i-lucide-scale" },
  { label: "Categories", icon: "i-lucide-tag" },
  { label: "Entries", icon: "i-lucide-receipt" },
];

const ledgerTotals = [
  {
    currency: "USD",
    icon: "i-lucide-dollar-sign",
    label: "USD Ledger",
    precision: "Cents",
    total: "$1,022.00",
    entryLabel: "4 published entries",
  },
  {
    currency: "KHR",
    icon: "i-lucide-coins",
    label: "KHR Ledger",
    precision: "Native Riel",
    total: "៛400,000",
    entryLabel: "2 published entries",
  },
];

const roomMenuItems: DropdownMenuItem[] = [
  { label: "Switch room", type: "label" },
  { label: "Riverside Villa", icon: "i-lucide-shield" },
  { label: "Koh Pich Studio", icon: "i-lucide-users" },
  { type: "separator" },
  { label: "Room settings", icon: "i-lucide-settings" },
  { type: "separator" },
  { label: "Create new room", icon: "i-lucide-plus" },
  { label: "Join with invite code", icon: "i-lucide-ticket" },
];

const activeCurrencyFilter = ref<"ALL" | "USD" | "KHR">("ALL");
const currencyFilterOptions = [
  { label: "All", value: "ALL" as const },
  { label: "USD", value: "USD" as const },
  { label: "KHR", value: "KHR" as const },
];
const activeSettlementCurrency = ref<"USD" | "KHR">("USD");
const settlementCurrencyItems: TabsItem[] = [
  { label: "USD", value: "USD" },
  { label: "KHR", value: "KHR" },
];

function setSettlementCurrency(value: string | number) {
  activeSettlementCurrency.value = value === "KHR" ? "KHR" : "USD";
}

function balanceTone(side: string) {
  if (side === "gets") return "text-success";
  if (side === "owes") return "text-error";
  return "text-toned";
}
const displayMode = ref<"list" | "table">("list");
const displayModeItems: TabsItem[] = [
  { label: "List", icon: "i-lucide-list", value: "list" },
  { label: "Table", icon: "i-lucide-table", value: "table" },
];

function setDisplayMode(value: string | number) {
  displayMode.value = value === "table" ? "table" : "list";
}

type MockEntry = {
  id: string;
  name: string;
  category: string;
  categoryIcon: string;
  paidBy: string;
  paidByInitials: string;
  paidByColor: "primary" | "info" | "warning" | "neutral";
  split: string;
  amount: string;
  currency: "USD" | "KHR";
  date: string;
};

const mockEntries: MockEntry[] = [
  {
    id: "e-1",
    name: "Apartment Rent",
    category: "Housing",
    categoryIcon: "i-lucide-house",
    paidBy: "Seth",
    paidByInitials: "S",
    paidByColor: "primary",
    split: "Equal (25% each)",
    amount: "$900.00",
    currency: "USD",
    date: "Aug 01",
  },
  {
    id: "e-2",
    name: "Central Market Groceries",
    category: "Food",
    categoryIcon: "i-lucide-shopping-cart",
    paidBy: "Ly",
    paidByInitials: "L",
    paidByColor: "info",
    split: "Equal (25% each)",
    amount: "៛180,000",
    currency: "KHR",
    date: "Aug 03",
  },
  {
    id: "e-3",
    name: "Fiber Internet (300Mbps)",
    category: "Utilities",
    categoryIcon: "i-lucide-wifi",
    paidBy: "Dara",
    paidByInitials: "D",
    paidByColor: "neutral",
    split: "Equal (25% each)",
    amount: "$45.00",
    currency: "USD",
    date: "Aug 05",
  },
  {
    id: "e-4",
    name: "Electric Power Utility",
    category: "Utilities",
    categoryIcon: "i-lucide-zap",
    paidBy: "Pich",
    paidByInitials: "P",
    paidByColor: "warning",
    split: "Seth & Pich (50/50)",
    amount: "៛220,000",
    currency: "KHR",
    date: "Aug 08",
  },
  {
    id: "e-5",
    name: "Drinking Water (5x 20L)",
    category: "Supplies",
    categoryIcon: "i-lucide-droplets",
    paidBy: "Seth",
    paidByInitials: "S",
    paidByColor: "primary",
    split: "Equal (25% each)",
    amount: "$12.00",
    currency: "USD",
    date: "Aug 10",
  },
  {
    id: "e-6",
    name: "Weekend Household Supplies",
    category: "Food",
    categoryIcon: "i-lucide-shopping-cart",
    paidBy: "Ly",
    paidByInitials: "L",
    paidByColor: "info",
    split: "Seth & Ly (50/50)",
    amount: "$65.00",
    currency: "USD",
    date: "Aug 14",
  },
];

const filteredEntries = computed(() => {
  if (activeCurrencyFilter.value === "ALL") return mockEntries;
  return mockEntries.filter((e) => e.currency === activeCurrencyFilter.value);
});

const entryColumns: TableColumn<MockEntry>[] = [
  { id: "name", header: "Description" },
  { accessorKey: "date", header: "Date", meta: { class: { td: "font-mono text-2xs text-muted" } } },
  { id: "paidBy", header: "Paid By" },
  {
    accessorKey: "split",
    header: "Split",
    meta: { class: { td: "font-mono text-2xs text-toned" } },
  },
  { accessorKey: "category", header: "Category" },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: {
      class: { th: "text-right", td: "text-right font-mono text-xs font-bold text-highlighted" },
    },
  },
];

const mockSettlements = {
  USD: {
    totalSpent: "$1,022.00",
    toMove: "$384.25",
    balances: [
      { name: "Seth", initials: "S", color: "primary" as const, side: "gets", amount: "+$384.25" },
      { name: "Ly", initials: "L", color: "info" as const, side: "owes", amount: "-$128.00" },
      { name: "Pich", initials: "P", color: "warning" as const, side: "owes", amount: "-$142.50" },
      { name: "Dara", initials: "D", color: "neutral" as const, side: "owes", amount: "-$113.75" },
    ],
    transfers: [
      { from: "Ly", to: "Seth", amount: "$128.00" },
      { from: "Pich", to: "Seth", amount: "$142.50" },
      { from: "Dara", to: "Seth", amount: "$113.75" },
    ],
  },
  KHR: {
    totalSpent: "៛400,000",
    toMove: "៛210,000",
    balances: [
      { name: "Ly", initials: "L", color: "info" as const, side: "gets", amount: "+៛135,000" },
      { name: "Pich", initials: "P", color: "warning" as const, side: "gets", amount: "+៛75,000" },
      { name: "Seth", initials: "S", color: "primary" as const, side: "owes", amount: "-៛110,000" },
      { name: "Dara", initials: "D", color: "neutral" as const, side: "owes", amount: "-៛100,000" },
    ],
    transfers: [
      { from: "Seth", to: "Ly", amount: "៛110,000" },
      { from: "Dara", to: "Ly", amount: "៛25,000" },
      { from: "Dara", to: "Pich", amount: "៛75,000" },
    ],
  },
};

const currentSettlement = computed(() => mockSettlements[activeSettlementCurrency.value]);
</script>

<template>
  <UContainer id="app-window" class="scroll-mt-20 py-16 sm:py-24 lg:py-32">
    <div class="divide-y divide-default rounded-md border border-default bg-default shadow-xl">
      <div
        class="flex items-center justify-between bg-muted/50 px-3.5 py-2.5 font-mono select-none sm:px-4 sm:py-3"
      >
        <div class="flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-full bg-red-500/80 sm:size-3" />
          <span class="inline-block size-2.5 rounded-full bg-amber-500/80 sm:size-3" />
          <span class="inline-block size-2.5 rounded-full bg-emerald-500/80 sm:size-3" />
        </div>

        <div
          class="hidden items-center gap-2 truncate rounded-md bg-default px-3 py-1.5 text-xs text-muted sm:flex"
        >
          <UIcon name="i-lucide-lock" class="size-3 shrink-0 text-toned" />
          <span class="text-highlighted">app.tricker.cc</span>
          <span class="text-toned">/rooms/riverside-villa/dashboard</span>
        </div>

        <div class="flex items-center gap-1.5 text-2xs text-muted">
          <span class="inline-block size-2 rounded-full bg-primary" />
          <span class="text-toned">Live · 2026-08</span>
        </div>
      </div>

      <div
        class="flex flex-col gap-2 border-b border-default bg-default px-3.5 py-2.5 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 lg:justify-start">
          <div class="flex min-w-0 items-center gap-2">
            <p class="shrink-0 text-sm font-bold text-highlighted sm:text-base">
              <span>Tricker</span><span class="text-primary">.</span>
            </p>

            <span class="shrink-0 text-xs text-toned sm:text-sm">/</span>

            <UDropdownMenu :items="roomMenuItems" :content="{ align: 'start', sideOffset: 8 }">
              <UButton
                label="Riverside Villa"
                icon="i-lucide-house"
                trailing-icon="i-lucide-chevron-down"
                color="neutral"
                variant="ghost"
                size="sm"
              />
            </UDropdownMenu>
          </div>

          <UBadge
            icon="i-lucide-circle-dot"
            label="August · Open"
            variant="subtle"
            color="success"
            class="shrink-0"
          />
        </div>

        <UNavigationMenu
          :items="mockNavItems"
          color="neutral"
          :ui="{
            list: 'flex-wrap',
            link: 'text-xs',
            linkLeadingIcon: 'size-4',
          }"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12">
        <div class="border-b border-default p-3.5 sm:p-6 lg:col-span-7 lg:border-r lg:border-b-0">
          <div class="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <div
              v-for="ledger in ledgerTotals"
              :key="ledger.currency"
              class="rounded-md border border-default bg-default p-3.5 sm:p-4"
            >
              <div
                class="mb-1.5 flex items-center justify-between gap-2 font-mono text-xs text-toned"
              >
                <span class="flex min-w-0 items-center gap-1.5">
                  <UIcon :name="ledger.icon" class="size-3.5 shrink-0 text-primary" />

                  <span class="truncate font-semibold text-highlighted">{{ ledger.label }}</span>
                </span>

                <span class="shrink-0 text-2xs text-muted">{{ ledger.precision }}</span>
              </div>

              <p class="text-xl font-bold text-highlighted tabular-nums sm:text-2xl">
                {{ ledger.total }}
              </p>

              <p class="text-2xs text-muted">{{ ledger.entryLabel }}</p>
            </div>
          </div>

          <div class="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-highlighted">Live Room Feed</h3>
              <span class="font-mono text-xs text-muted">August 2026</span>
            </div>

            <div class="flex items-center justify-between gap-2 font-mono sm:justify-end">
              <USelect
                v-model="activeCurrencyFilter"
                icon="i-lucide-filter"
                :items="currencyFilterOptions"
                size="sm"
                class="ring-default"
              />

              <UTabs
                :model-value="displayMode"
                :items="displayModeItems"
                :content="false"
                size="sm"
                :ui="{
                  list: 'bg-muted/50',
                  trigger: 'data-[state=active]:text-primary',
                  indicator: 'bg-default',
                }"
                @update:model-value="setDisplayMode"
              />
            </div>
          </div>

          <ul v-if="displayMode === 'list'" class="space-y-2">
            <li
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="flex items-start gap-2.5 rounded-md border border-default bg-default p-3 transition-colors hover:bg-muted/40 sm:gap-3"
            >
              <div
                class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
              >
                <UIcon :name="entry.categoryIcon" class="size-4 text-toned" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <LandingEntryName :name="entry.name" :currency="entry.currency" emphasis />
                  <span
                    class="shrink-0 font-mono text-sm font-bold text-highlighted tabular-nums sm:text-base"
                  >
                    {{ entry.amount }}
                  </span>
                </div>
                <div
                  class="mt-1 flex items-center justify-between gap-2 font-mono text-2xs text-muted"
                >
                  <div class="flex min-w-0 items-center gap-1.5">
                    <span class="shrink-0 text-toned">{{ entry.date }}</span>
                    <span class="shrink-0">·</span>
                    <LandingEntryPayer
                      :initials="entry.paidByInitials"
                      :color="entry.paidByColor"
                      :name="entry.paidBy"
                    />
                  </div>
                  <div class="flex min-w-0 items-center justify-end gap-1.5">
                    <span class="min-w-0 truncate text-toned">{{ entry.split }}</span>
                    <LandingEntryCategory :category="entry.category" />
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <UTable
            v-else
            :data="filteredEntries"
            :columns="entryColumns"
            :ui="{
              root: 'border border-default bg-default',
              thead: 'bg-muted/50',
              tr: 'hover:bg-muted/40 transition-colors',
              th: 'font-mono text-toned',
            }"
          >
            <template #name-cell="{ row }">
              <div class="flex min-w-0 items-center gap-2">
                <UIcon :name="row.original.categoryIcon" class="size-3.5 shrink-0 text-toned" />
                <LandingEntryName :name="row.original.name" :currency="row.original.currency" />
              </div>
            </template>

            <template #paidBy-cell="{ row }">
              <LandingEntryPayer
                :initials="row.original.paidByInitials"
                :color="row.original.paidByColor"
                :name="row.original.paidBy"
              />
            </template>

            <template #category-cell="{ row }">
              <LandingEntryCategory :category="row.original.category" />
            </template>
          </UTable>
        </div>

        <div class="flex flex-col justify-between bg-default p-3.5 sm:p-6 lg:col-span-5">
          <div>
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-highlighted">Settlement Graph</h3>
                <p class="text-xs text-muted">Directed minimum-transfer graph</p>
              </div>
              <UTabs
                :model-value="activeSettlementCurrency"
                :items="settlementCurrencyItems"
                :content="false"
                size="sm"
                :ui="{
                  list: 'bg-muted/50',
                  trigger: 'data-[state=active]:text-primary',
                  indicator: 'bg-default',
                }"
                @update:model-value="setSettlementCurrency"
              />
            </div>
            <div class="mb-4 rounded-lg border border-default bg-muted/50 p-3">
              <div class="flex items-center justify-between font-mono text-xs">
                <span class="text-toned">Total in Balance</span>
                <span class="font-bold text-highlighted tabular-nums">
                  {{ currentSettlement.totalSpent }}
                </span>
              </div>
              <div class="mt-1 flex items-center justify-between font-mono text-xs">
                <span class="text-toned">To Transfer</span>
                <span class="font-bold text-primary tabular-nums">
                  {{ currentSettlement.toMove }}
                </span>
              </div>
            </div>
            <div class="mb-5">
              <p class="mb-2 font-mono text-2xs tracking-wider text-toned uppercase">
                Net Roommate Balances
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="b in currentSettlement.balances"
                  :key="b.name"
                  class="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-muted/40"
                >
                  <div class="flex items-center gap-2">
                    <UAvatar :text="b.initials" :color="b.color" size="xs" />

                    <span class="font-medium text-highlighted">{{ b.name }}</span>
                  </div>
                  <div class="flex items-center gap-2 font-mono tabular-nums">
                    <span class="text-2xs text-toned">{{ b.side }}</span>
                    <span :class="['text-xs font-semibold', balanceTone(b.side)]">
                      {{ b.amount }}
                    </span>
                  </div>
                </li>
              </ul>
            </div>
            <div>
              <div class="mb-2 flex items-center justify-between">
                <p class="font-mono text-2xs tracking-wider text-toned uppercase">
                  Fewest Transfers to Settle
                </p>
                <span class="font-mono text-2xs text-muted">
                  {{ currentSettlement.transfers.length }} paths
                </span>
              </div>
              <ul class="space-y-2">
                <li
                  v-for="(t, idx) in currentSettlement.transfers"
                  :key="idx"
                  class="flex items-center justify-between rounded-lg border border-default bg-muted/30 p-2.5 font-mono text-xs"
                >
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="truncate font-bold text-highlighted">{{ t.from }}</span>
                    <UIcon name="i-lucide-arrow-right" class="size-3 shrink-0 text-muted" />
                    <span class="truncate font-bold text-highlighted">{{ t.to }}</span>
                  </div>
                  <span class="shrink-0 pl-2 font-bold text-primary tabular-nums">
                    {{ t.amount }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-6 border-t border-default pt-4">
            <UButton
              label="Close & Lock Month"
              icon="i-lucide-lock"
              color="neutral"
              variant="outline"
              size="sm"
              block
              class="font-mono text-xs"
            />
            <p class="mt-2 text-center font-mono text-2xs text-muted">
              Closing locks settlement graph with audit snapshot.
            </p>
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>
