<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const currency = ref<"USD" | "KHR">("USD");
const currencyItems: TabsItem[] = [
  { label: "USD", value: "USD" },
  { label: "KHR", value: "KHR" },
];
const viewItems: TabsItem[] = [
  { label: "Who owes what", value: "settlement", icon: "i-lucide-arrow-right-left" },
  { label: "Shared bills", value: "bills", icon: "i-lucide-receipt" },
];

const ledgers = {
  USD: {
    total: "$660.00",
    share: "$220.00 each",
    bills: [
      { name: "Monthly rent", payer: "Seth", amount: "$600.00", icon: "i-lucide-house" },
      { name: "Internet", payer: "Dara", amount: "$60.00", icon: "i-lucide-wifi" },
    ],
    transfers: [
      { from: "Ly", to: "Seth", amount: "$220.00" },
      { from: "Dara", to: "Seth", amount: "$160.00" },
    ],
    recipient: "Seth gets back $380.00",
  },
  KHR: {
    total: "៛120,000",
    share: "៛40,000 each",
    bills: [
      {
        name: "Market groceries",
        payer: "Ly",
        amount: "៛120,000",
        icon: "i-lucide-shopping-basket",
      },
    ],
    transfers: [
      { from: "Seth", to: "Ly", amount: "៛40,000" },
      { from: "Dara", to: "Ly", amount: "៛40,000" },
    ],
    recipient: "Ly gets back ៛80,000",
  },
};

const ledger = computed(() => ledgers[currency.value]);

function setCurrency(value: string | number) {
  currency.value = value === "KHR" ? "KHR" : "USD";
}
</script>

<template>
  <div
    id="app-window"
    class="scroll-mt-24 overflow-hidden rounded-xl border border-accented bg-default"
    role="region"
    aria-label="Interactive household demo"
    tabindex="0"
  >
    <div
      class="flex items-center justify-between border-b border-default bg-muted/50 px-4 py-3 sm:px-5"
    >
      <span class="flex items-center gap-2 font-mono text-xs text-toned">
        <UIcon name="i-lucide-house" class="size-3.5" />
        Riverside home
      </span>
      <UBadge label="Demo" color="neutral" variant="outline" size="sm" />
    </div>

    <div class="p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs text-muted">August · Sample month</p>
          <h2 class="mt-1 text-lg font-semibold text-highlighted">Everyone on the same page.</h2>
        </div>
        <div class="flex -space-x-2" role="img" aria-label="Three housemates: Seth, Ly, and Dara">
          <span
            v-for="name in ['S', 'L', 'D']"
            :key="name"
            class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-elevated text-xs font-semibold text-toned"
            aria-hidden="true"
          >
            {{ name }}
          </span>
        </div>
      </div>

      <div class="mt-5 rounded-lg border border-default bg-muted/40 p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-toned">Shared this month</p>
          <UTabs
            :model-value="currency"
            :items="currencyItems"
            :content="false"
            color="neutral"
            size="sm"
            role="group"
            aria-label="Demo currency"
            :ui="{ list: 'bg-default', indicator: 'bg-inverted' }"
            @update:model-value="setCurrency"
          />
        </div>
        <p class="mt-2 font-mono text-3xl font-semibold text-highlighted tabular-nums sm:text-4xl">
          {{ ledger.total }}
        </p>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Split equally · {{ ledger.share }}</span>
          <span class="flex items-center gap-1 text-toned">
            <UIcon name="i-lucide-check" class="size-3.5" />
            No currency conversion
          </span>
        </div>
      </div>

      <UTabs
        :items="viewItems"
        default-value="settlement"
        size="sm"
        variant="link"
        color="neutral"
        class="mt-4"
        :ui="{ trigger: 'grow justify-center', content: 'pt-3' }"
      >
        <template #content="{ item }">
          <div class="min-h-44">
            <template v-if="item.value === 'settlement'">
              <p class="mb-3 text-xs text-muted">Just two transfers to square things up.</p>
              <ul class="space-y-2">
                <li
                  v-for="transfer in ledger.transfers"
                  :key="transfer.from"
                  class="flex items-center justify-between gap-2 rounded-md border border-default p-3 text-sm"
                >
                  <span class="flex items-center gap-2 text-highlighted">
                    {{ transfer.from }}
                    <UIcon name="i-lucide-arrow-right" class="size-3.5 text-muted" />
                    {{ transfer.to }}
                  </span>
                  <span class="font-mono font-semibold text-highlighted tabular-nums">
                    {{ transfer.amount }}
                  </span>
                </li>
              </ul>
              <p class="mt-3 flex items-center gap-1.5 text-xs text-toned">
                <UIcon name="i-lucide-circle-check" class="size-4" />
                {{ ledger.recipient }}
              </p>
            </template>
            <template v-else>
              <p class="mb-3 text-xs text-muted">Paid by a housemate. Shared by all three.</p>
              <ul class="space-y-2">
                <li
                  v-for="bill in ledger.bills"
                  :key="bill.name"
                  class="flex items-center gap-3 rounded-md border border-default p-3"
                >
                  <UIcon :name="bill.icon" class="size-4 shrink-0 text-toned" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-highlighted">{{ bill.name }}</p>
                    <p class="text-xs text-muted">{{ bill.payer }} paid · Equal split</p>
                  </div>
                  <span
                    class="shrink-0 font-mono text-sm font-semibold text-highlighted tabular-nums"
                  >
                    {{ bill.amount }}
                  </span>
                </li>
              </ul>
            </template>
          </div>
        </template>
      </UTabs>
    </div>

    <div
      class="flex items-center gap-2 border-t border-default bg-muted/40 px-4 py-3 text-xs text-muted sm:px-6"
    >
      <UIcon name="i-lucide-mouse-pointer-2" class="size-3.5 shrink-0" />
      Try switching currencies or exploring the bills. No account needed.
    </div>
  </div>
</template>
