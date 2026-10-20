<script setup lang="ts">
const shares = [
  { name: "Seth", percent: "40%", width: "w-[40%]", bar: "rounded-s-full bg-primary" },
  { name: "Ly", percent: "30%", width: "w-[30%]", bar: "bg-accented" },
  { name: "Dara", percent: "30%", width: "w-[30%]", bar: "rounded-e-full bg-elevated" },
];
</script>

<template>
  <UContainer id="features" class="scroll-mt-20 py-8">
    <UPageGrid class="gap-3 sm:gap-4 lg:grid-cols-2">
      <UCard :ui="{ body: 'p-4 sm:p-6' }">
        <div class="flex items-start gap-3">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-default bg-muted text-toned"
          >
            <UIcon name="i-lucide-chart-pie" class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-bold text-highlighted sm:text-base">
                A bigger room? Custom % splits
              </h3>
              <UBadge
                label="100%"
                color="neutral"
                variant="outline"
                size="sm"
                class="shrink-0 font-mono"
              />
            </div>
            <p class="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
              Set a share for each person on that bill. A larger room can take 40%, the others 30%.
              Shares must add up to 100%.
            </p>
            <div class="mt-4 flex h-2 gap-0.5">
              <span v-for="share in shares" :key="share.name" :class="[share.width, share.bar]" />
            </div>
            <div class="mt-1.5 flex justify-between font-mono text-xs text-dimmed">
              <span v-for="share in shares" :key="share.name">
                {{ share.name }} {{ share.percent }}
              </span>
            </div>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-4 sm:p-6' }">
        <div class="flex items-start gap-3">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-default bg-muted text-toned"
          >
            <UIcon name="i-lucide-repeat" class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-bold text-highlighted sm:text-base">
                Recurring bills, one less reminder
              </h3>
              <UBadge label="Auto" color="primary" variant="subtle" size="sm" class="shrink-0" />
            </div>
            <p class="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
              Rent, Wi-Fi, and trash can post on the 1st from a template you set once. No monthly
              reminder in the group chat.
            </p>
          </div>
        </div>
      </UCard>
    </UPageGrid>
  </UContainer>
</template>
