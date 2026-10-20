<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";

const steps = [
  {
    title: "Bring your people",
    description: "Create a room and share an invite link or code. Housemates join that room.",
    icon: "i-lucide-user-plus",
  },
  {
    title: "Add everyday bills",
    description:
      "Pick USD or KHR, who paid, and who shares the cost. Shares on a bill add up to 100%.",
    icon: "i-lucide-receipt",
  },
  {
    title: "Square up, move on",
    description:
      "See the fewest transfers that settle the month. You pay each other directly. Tricker doesn't move the money.",
    icon: "i-lucide-handshake",
  },
];

const stepperItems: StepperItem[] = steps.map(({ title, description }) => ({ title, description }));
</script>

<template>
  <UContainer id="how-it-works" class="scroll-mt-20">
    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <div class="mx-auto flex w-full max-w-(--ui-container) flex-col gap-8">
        <div>
          <div class="mb-3">
            <p class="font-mono text-xs font-medium tracking-wider text-dimmed uppercase">
              Simple Workflow
            </p>
          </div>

          <h2
            class="text-left text-xl font-bold tracking-tight text-pretty text-highlighted sm:text-3xl"
          >
            How Tricker keeps it smooth
          </h2>
        </div>

        <UStepper
          :items="stepperItems"
          orientation="vertical"
          size="sm"
          disabled
          :ui="{
            root: 'md:hidden',
            title: 'font-bold text-highlighted',
            description: 'text-muted',
          }"
        />

        <div class="hidden gap-4 md:grid md:grid-cols-3">
          <UCard v-for="(step, index) in steps" :key="step.title" :ui="{ body: 'p-5' }">
            <span
              class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <UIcon :name="step.icon" class="size-5" />
            </span>
            <p class="mt-4 font-mono text-xs tracking-wider text-dimmed uppercase">
              {{ String(index + 1).padStart(2, "0") }} · Step
            </p>
            <h3 class="mt-2 text-base font-bold text-highlighted">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ step.description }}</p>
          </UCard>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
