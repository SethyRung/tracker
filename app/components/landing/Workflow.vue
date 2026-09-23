<script setup lang="ts">
const onboardingSteps = [
  {
    step: "01",
    title: "Open or join a room",
    description:
      "Create your household space, activate USD, KHR, or both, and invite roommates via instant link or email.",
    icon: "i-lucide-user-plus",
  },
  {
    step: "02",
    title: "Log bills as they happen",
    description:
      "Anyone in the room logs expenses. Pick who paid, select who benefits, and watch the split validate to 100%.",
    icon: "i-lucide-receipt",
  },
  {
    step: "03",
    title: "Settle in minutes",
    description:
      "At month-end, review the directed settlement graph. Make the suggested transfers to clear both ledgers cleanly.",
    icon: "i-lucide-handshake",
  },
];
</script>

<template>
  <section id="how-it-works" class="scroll-mt-20 border-t border-default">
    <UContainer class="py-16 sm:py-24 lg:py-32">
      <div class="mb-12 max-w-2xl">
        <p class="font-mono text-xs tracking-wider text-toned uppercase">Workflow</p>

        <h2 class="mt-2 font-sans text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
          From first bill to settled month.
        </h2>

        <p class="mt-3 text-base leading-relaxed text-muted">
          No messy shared docs, no spreadsheet formulas to debug, and no group-chat payment
          squabbles.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="step in onboardingSteps"
          :key="step.step"
          class="flex flex-col justify-between rounded-md border border-default bg-default p-6"
        >
          <div>
            <div class="mb-4 flex items-center justify-between">
              <span class="font-mono text-2xl font-bold text-primary">{{ step.step }}</span>
              <div
                class="flex size-8 items-center justify-center rounded-sm bg-muted text-highlighted"
              >
                <UIcon :name="step.icon" class="size-4" />
              </div>
            </div>
            <h3 class="text-lg font-bold text-highlighted">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>
