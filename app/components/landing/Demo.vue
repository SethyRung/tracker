<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

type Currency = "USD" | "KHR";

const currency = ref<Currency>("USD");

const ledgers = {
  USD: {
    total: "$60.00",
    bills: [{ name: "Rent", payer: "Seth paid", share: "$20.00 each", amount: "$60.00" }],
    transfers: [
      { from: "Ly", to: "Seth", amount: "$20.00" },
      { from: "Dara", to: "Seth", amount: "$20.00" },
    ],
    netLabel: "Seth gets back",
    net: "+$40.00",
  },
  KHR: {
    total: "៛120,000",
    bills: [{ name: "Market run", payer: "Ly paid", share: "៛40,000 each", amount: "៛120,000" }],
    transfers: [
      { from: "Seth", to: "Ly", amount: "៛40,000" },
      { from: "Dara", to: "Ly", amount: "៛40,000" },
    ],
    netLabel: "Ly gets back",
    net: "+៛80,000",
  },
};

const ledger = computed(() => ledgers[currency.value]);

const currencyItems = computed<TabsItem[]>(() => [
  { label: `USD ${ledgers.USD.total}`, value: "USD" },
  { label: `KHR ${ledgers.KHR.total}`, value: "KHR" },
]);

const viewItems: TabsItem[] = [
  { label: "Balances", slot: "balances" },
  { label: "Shared bills", slot: "bills" },
];
</script>

<template>
  <UCard
    id="demo"
    class="scroll-mt-24 text-left"
    :ui="{ header: 'p-4 sm:px-6', body: 'p-4 sm:p-6', footer: 'p-4 sm:px-6' }"
  >
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-md border border-default bg-muted text-toned"
            >
              <UIcon name="i-lucide-building" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-highlighted sm:text-base">Riverside home</p>
              <p class="font-mono text-xs text-dimmed">3 roommates</p>
            </div>
          </div>
          <UBadge label="Sample month" color="neutral" variant="outline" size="sm" />
        </div>

        <UTabs
          v-model="currency"
          :items="currencyItems"
          :content="false"
          color="neutral"
          size="sm"
          class="w-full sm:w-auto"
        />
      </div>
    </template>

    <UTabs :items="viewItems" color="neutral" size="sm">
      <template #balances>
        <ul class="space-y-2 rounded-lg border border-default bg-muted p-3 sm:p-4">
          <li
            v-for="transfer in ledger.transfers"
            :key="`${transfer.from}-${transfer.to}`"
            class="flex items-center justify-between gap-2 text-xs sm:text-sm"
          >
            <span class="flex min-w-0 items-center gap-1.5 text-toned">
              <span class="size-1.5 shrink-0 rounded-full bg-accented" />
              <span class="truncate">{{ transfer.from }} pays {{ transfer.to }}</span>
            </span>
            <span class="shrink-0 font-mono font-semibold text-highlighted tabular-nums">
              {{ transfer.amount }}
            </span>
          </li>
          <li
            class="flex items-center justify-between gap-2 border-t border-default pt-2 text-xs sm:text-sm"
          >
            <span class="flex items-center gap-1 font-semibold text-success">
              <UIcon name="i-lucide-circle-check" class="size-3.5" />
              {{ ledger.netLabel }}
            </span>
            <UBadge
              :label="ledger.net"
              color="success"
              variant="subtle"
              size="sm"
              class="font-mono tabular-nums"
            />
          </li>
        </ul>
      </template>

      <template #bills>
        <ul class="space-y-2 rounded-lg border border-default bg-muted p-3 sm:p-4">
          <li
            v-for="bill in ledger.bills"
            :key="bill.name"
            class="flex items-center justify-between gap-3 text-xs sm:text-sm"
          >
            <span class="min-w-0">
              <span class="block truncate font-medium text-highlighted">{{ bill.name }}</span>
              <span class="text-muted">{{ bill.payer }} · {{ bill.share }}</span>
            </span>
            <span class="shrink-0 font-mono font-semibold text-highlighted tabular-nums">
              {{ bill.amount }}
            </span>
          </li>
        </ul>
      </template>
    </UTabs>

    <template #footer>
      <p class="flex items-center justify-center gap-1.5 text-center font-mono text-xs text-muted">
        <UIcon name="i-lucide-arrow-right-left" class="size-3.5 shrink-0" />
        Two separate ledgers. No exchange rate.
      </p>
    </template>
  </UCard>
</template>
