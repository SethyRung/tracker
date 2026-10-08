<script setup lang="ts">
const everydayBills = [
  {
    name: "Rent + internet",
    payer: "Seth & Dara paid",
    amount: "$660.00",
    currency: "USD",
    icon: "i-lucide-house",
    share: "$220.00",
  },
  {
    name: "A market run",
    payer: "Ly paid",
    amount: "៛120,000",
    currency: "KHR",
    icon: "i-lucide-shopping-basket",
    share: "៛40,000",
  },
];
</script>

<template>
  <section id="currencies" class="scroll-mt-20">
    <UContainer class="py-14 sm:py-20 lg:py-24">
      <div class="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div class="lg:col-span-5">
          <p class="font-mono text-xs tracking-wider text-toned uppercase">
            One home. Two currencies.
          </p>
          <h2
            class="mt-3 text-3xl leading-tight font-bold tracking-tight text-highlighted sm:text-4xl"
          >
            Life happens in dollars <span class="text-muted">and riel.</span>
          </h2>
          <p class="mt-4 text-base leading-relaxed text-muted">
            Your landlord takes dollars. The market takes riel. Your household shouldn't need an
            exchange-rate debate every time someone buys groceries.
          </p>
          <p class="mt-4 text-base leading-relaxed text-muted">
            Tricker keeps two separate totals and two clear settlement plans. Pay back in the
            currency that was spent. Nothing gets mixed.
          </p>
          <div
            class="mt-6 inline-flex items-center gap-2 rounded-md border border-default px-3 py-2 text-xs text-toned"
          >
            <UIcon name="i-lucide-equal-not" class="size-4 shrink-0" />
            No exchange rates. No conversion surprises.
          </div>
        </div>

        <div class="min-w-0 lg:col-span-7">
          <div class="mb-4 flex items-center gap-2 text-xs text-muted">
            <UIcon name="i-lucide-receipt" class="size-4" />
            A month at Riverside · 3 housemates · Equal shares
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <article
              v-for="bill in everydayBills"
              :key="bill.currency"
              class="overflow-hidden rounded-xl border border-default bg-muted/40"
            >
              <div class="p-5 sm:p-6">
                <div class="flex items-center justify-between">
                  <div
                    class="flex size-10 items-center justify-center rounded-lg border border-default bg-default"
                  >
                    <UIcon :name="bill.icon" class="size-5 text-toned" />
                  </div>
                  <UBadge
                    :label="bill.currency"
                    color="neutral"
                    variant="outline"
                    class="font-mono"
                  />
                </div>
                <h3 class="mt-5 text-base font-semibold text-highlighted">{{ bill.name }}</h3>
                <p class="mt-1 text-xs text-muted">{{ bill.payer }}</p>
                <p class="mt-4 font-mono text-2xl font-semibold text-highlighted tabular-nums">
                  {{ bill.amount }}
                </p>
              </div>
              <div class="border-t border-dashed border-default bg-default px-5 py-4 sm:px-6">
                <p class="text-xs text-muted">Each housemate's share</p>
                <p class="mt-1 font-mono text-lg font-semibold text-highlighted tabular-nums">
                  {{ bill.share }}
                </p>
              </div>
            </article>
          </div>
          <p class="mt-4 text-center font-mono text-xs text-muted">
            Separate ledgers. The same peace of mind.
          </p>
        </div>
      </div>
    </UContainer>
  </section>
</template>
