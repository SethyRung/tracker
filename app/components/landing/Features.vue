<script setup lang="ts">
const architecturePillars = [
  {
    tag: "Multi-Tenant",
    title: "Sovereign Household Rooms",
    description:
      "Every household is an isolated room with independent members, rules, currencies, and settlement archives. Join multiple rooms without data bleed.",
    icon: "i-lucide-door-open",
    colSpan: "lg:col-span-7",
  },
  {
    tag: "Dual Currency",
    title: "Zero Conversion Drift",
    description:
      "USD cents and KHR riel operate in parallel. No exchange-rate guesswork, no hidden spread losses, and no awkward conversions.",
    icon: "i-lucide-coins",
    colSpan: "lg:col-span-5",
  },
  {
    tag: "Integer Math",
    title: "10,000 Basis Points Engine",
    description:
      "Every bill split is stored and verified in integer basis points. Equal splits, custom weighted shares, or individual ratios must total exactly 10,000 bps.",
    icon: "i-lucide-percent",
    colSpan: "lg:col-span-5",
  },
  {
    tag: "Graph Theory",
    title: "Minimum-Transfer Settlement",
    description:
      "Greedy graph reduction calculates the fewest peer-to-peer payment transfers needed to completely balance all debtors and creditors.",
    icon: "i-lucide-scale",
    colSpan: "lg:col-span-7",
  },
  {
    tag: "Audit Integrity",
    title: "Immutable Month Closing",
    description:
      "Active months accept live additions and edits. Closing freezes entries and finalizes the settlement plan into a permanent audit snapshot.",
    icon: "i-lucide-calendar-check",
    colSpan: "lg:col-span-6",
  },
  {
    tag: "Cron Automation",
    title: "1st-of-Month Recurring Bills",
    description:
      "Automated tasks trigger at 00:00 ICT on the 1st of every month, auto-drafting published entries for rent and recurring utilities with active housemates.",
    icon: "i-lucide-repeat",
    colSpan: "lg:col-span-6",
  },
];
</script>

<template>
  <section id="features" class="scroll-mt-20 bg-muted/20 py-16 sm:py-24 lg:py-32">
    <UContainer>
      <div class="mb-12 max-w-2xl">
        <p class="font-mono text-xs tracking-wider text-toned uppercase">System Design</p>

        <h2 class="mt-2 font-sans text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
          Engineered for shared living math.
        </h2>

        <p class="mt-3 text-base leading-relaxed text-muted">
          Every feature in Tricker exists to eliminate awkward calculations, currency confusion, and
          untracked household IOUs.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div
          v-for="pillar in architecturePillars"
          :key="pillar.title"
          :class="[
            pillar.colSpan,
            'flex flex-col justify-between rounded-md border border-default bg-default p-6 transition-colors hover:bg-muted/30',
          ]"
        >
          <div>
            <div class="mb-4 flex items-center justify-between gap-2">
              <div
                class="flex size-8 items-center justify-center rounded-sm border border-default bg-muted"
              >
                <UIcon :name="pillar.icon" class="size-4 text-primary" />
              </div>

              <UBadge
                :label="pillar.tag"
                variant="subtle"
                color="neutral"
                size="xs"
                class="font-mono"
              />
            </div>

            <h3 class="text-lg font-bold text-highlighted">{{ pillar.title }}</h3>

            <p class="mt-2 text-sm leading-relaxed text-muted">{{ pillar.description }}</p>
          </div>
          <div class="mt-6 flex items-center justify-between border-t border-default/60 pt-4">
            <span class="font-mono text-2xs tracking-wider text-toned uppercase">
              Feature Architecture
            </span>

            <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-toned" />
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>
