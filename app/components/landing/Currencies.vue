<script setup lang="ts">
const currencies = [
  {
    code: "USD",
    name: "United States Dollar",
    sample: "$1,234.56",
    minorUnits: "123,456 cents · 2 decimal places",
    note: "Clean cents precision for rent, international bills, and shared subscriptions.",
  },
  {
    code: "KHR",
    name: "Khmer Riel",
    sample: "៛1,234,567",
    minorUnits: "1,234,567 riel minor · Zero subunits",
    note: "Native integer tracking for daily market runs, utilities, and street vendors.",
  },
];
</script>

<template>
  <section id="currencies" class="scroll-mt-20 border-t border-default">
    <UContainer class="py-16 sm:py-24 lg:py-32">
      <div class="grid gap-8 sm:gap-10 lg:grid-cols-12 lg:items-center">
        <div class="lg:col-span-5">
          <p class="font-mono text-xs tracking-wider text-toned uppercase">Currency Isolation</p>
          <h2 class="mt-2 font-sans text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
            Two ledgers.<br />
            Zero conversion.
          </h2>

          <p class="mt-4 text-base leading-relaxed text-muted">
            Household finances should never gamble on daily bank or money-changer rates. Tricker
            stores USD and KHR in separate pipelines with dedicated settlement outputs.
          </p>

          <div class="mt-6 space-y-2.5">
            <div class="flex items-center gap-2 text-sm text-highlighted">
              <UIcon name="i-lucide-check" class="size-4 shrink-0 text-primary" />
              <span>USD stored as integer cents (amount_minor)</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-highlighted">
              <UIcon name="i-lucide-check" class="size-4 shrink-0 text-primary" />
              <span>KHR stored as native integer riel (no fractions)</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-highlighted">
              <UIcon name="i-lucide-check" class="size-4 shrink-0 text-primary" />
              <span>Two independent settlement graphs generated side-by-side</span>
            </div>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <div
            v-for="item in currencies"
            :key="item.code"
            class="rounded-md border border-default bg-default p-6"
          >
            <div class="mb-4 flex items-center justify-between">
              <span class="font-mono text-xs tracking-wider text-toned uppercase">
                {{ item.name }}
              </span>
              <UBadge :label="item.code" variant="outline" size="xs" class="font-mono" />
            </div>
            <p class="font-mono text-3xl font-bold text-highlighted tabular-nums sm:text-4xl">
              {{ item.sample }}
            </p>
            <p class="mt-2 font-mono text-xs text-muted">{{ item.minorUnits }}</p>
            <div class="mt-6 border-t border-default pt-4 text-xs leading-relaxed text-muted">
              {{ item.note }}
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>
