<script setup lang="ts">
const steps = [
  {
    number: "01",
    title: "Bring your people",
    description:
      "Create a room and invite your housemates. Or join the one they've already started.",
    icon: "i-lucide-user-plus",
  },
  {
    number: "02",
    title: "Add the everyday bills",
    description: "Choose the currency, who paid, and who shares the cost. We'll handle the totals.",
    icon: "i-lucide-receipt",
  },
  {
    number: "03",
    title: "Square up, move on",
    description:
      "See who pays whom in each currency. Make the transfers and get on with your month.",
    icon: "i-lucide-handshake",
  },
];
</script>

<template>
  <section id="how-it-works" class="scroll-mt-20">
    <UContainer class="py-14 sm:py-20 lg:py-24">
      <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div class="lg:col-span-4">
          <p class="font-mono text-xs tracking-wider text-toned uppercase">How it works</p>
          <h2
            class="mt-3 text-3xl leading-tight font-bold tracking-tight text-highlighted sm:text-4xl"
          >
            From “I paid”<br />to “we're good.”
          </h2>
          <p class="mt-4 text-sm leading-relaxed text-muted">
            A shared routine, not another chore. Three steps to make household money a little
            easier.
          </p>
          <UButton
            label="See it in action"
            to="#app-window"
            variant="link"
            color="neutral"
            trailing-icon="i-lucide-arrow-up-right"
            class="mt-5 p-0"
          />
        </div>
        <ol class="lg:col-span-8">
          <li
            v-for="step in steps"
            :key="step.number"
            class="grid grid-cols-[auto_1fr] gap-4 border-b border-default py-6 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[auto_1fr_auto] sm:gap-6"
          >
            <span class="pt-1 font-mono text-sm text-muted">{{ step.number }}</span>
            <div>
              <h3 class="text-lg font-semibold text-highlighted">{{ step.title }}</h3>
              <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted">{{ step.description }}</p>
            </div>
            <div
              class="hidden size-10 items-center justify-center rounded-lg border border-default bg-muted/40 sm:flex"
            >
              <UIcon :name="step.icon" class="size-5 text-toned" />
            </div>
          </li>
        </ol>
      </div>
    </UContainer>
  </section>
</template>
