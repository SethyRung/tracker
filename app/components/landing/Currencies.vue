<script setup lang="ts">
const ledgers = [
  {
    name: "Rent",
    currency: "USD ledger",
    total: "$60.00",
    share: "$20.00",
    icon: "i-lucide-house",
  },
  {
    name: "Market run",
    currency: "KHR ledger",
    total: "៛120,000",
    share: "៛40,000",
    icon: "i-lucide-shopping-basket",
  },
];
</script>

<template>
  <UContainer>
    <UCard id="currencies" class="scroll-mt-20" :ui="{ body: 'p-4 sm:p-6' }">
      <div class="mx-auto flex flex-col gap-8">
        <div>
          <div class="mb-3">
            <p class="font-mono text-xs font-medium tracking-wider text-dimmed uppercase">
              One home. Two currencies.
            </p>
          </div>

          <h2
            class="text-left text-xl font-bold tracking-tight text-pretty text-highlighted sm:text-3xl"
          >
            Life happens in dollars and riel
          </h2>

          <div class="mt-3 max-w-lg text-left text-sm text-pretty text-muted sm:text-lg">
            Your landlord takes dollars. The local market takes riel. Tricker maintains two
            independent ledgers so housemates settle each currency accurately without conversion
            losses.
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:gap-4">
          <UCard v-for="ledger in ledgers" :key="ledger.currency" :ui="{ body: 'p-3 sm:p-6' }">
            <div class="flex h-full flex-col justify-between gap-3 sm:gap-6">
              <div>
                <p
                  class="flex items-center gap-1.5 text-xs font-semibold text-highlighted sm:text-sm"
                >
                  <UIcon :name="ledger.icon" class="size-4 shrink-0 text-toned" />
                  <span class="truncate">{{ ledger.name }}</span>
                </p>
                <p class="mt-1 font-mono text-xs text-dimmed">{{ ledger.currency }}</p>
              </div>
              <div>
                <p
                  class="font-mono text-sm font-semibold text-highlighted tabular-nums sm:text-2xl"
                >
                  {{ ledger.total }}
                </p>
                <p class="mt-1 text-xs text-muted sm:text-sm">
                  <span class="font-mono font-semibold text-highlighted tabular-nums">
                    {{ ledger.share }}
                  </span>
                  each
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
