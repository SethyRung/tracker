<script setup lang="ts">
const sovereignRules = [
  {
    number: "01",
    title: "A room is an island",
    body: "Entries, categories, members, and historical records stay strictly confined to their room. One account can hold multiple rooms with zero overlap.",
  },
  {
    number: "02",
    title: "Shares must equal 100%",
    body: "All splits compute in integer basis points (10,000 bps). An entry cannot be saved until all roommate shares add up to 10,000 bps exactly.",
  },
  {
    number: "03",
    title: "Closing freezes history",
    body: "Closing a month creates an unalterable financial record. No edits, no deletions, and no retroactive disputes. Only an admin can reopen.",
  },
];
</script>

<template>
  <section id="rules" class="border-t border-default py-12 sm:py-20 lg:py-24">
    <UContainer>
      <div class="mb-12 max-w-2xl">
        <p class="font-mono text-xs tracking-wider text-toned uppercase">Core Principles</p>
        <h2 class="mt-2 font-sans text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
          Three rules for peace of mind.
        </h2>
      </div>
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="rule in sovereignRules"
          :key="rule.number"
          class="rounded-md border border-default bg-default p-6"
        >
          <span class="font-mono text-xs font-bold text-primary">{{ rule.number }}</span>
          <h3 class="mt-3 text-lg font-bold text-highlighted">{{ rule.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted">{{ rule.body }}</p>
        </div>
      </div>
    </UContainer>
  </section>
</template>
