<script setup lang="ts">
const { loggedIn } = useUserSession();

const primaryCta = computed(() =>
  loggedIn.value
    ? { to: "/rooms", label: "Go to your rooms" }
    : { to: "/sign-up", label: "Start your household" },
);
</script>

<template>
  <UPageHero
    description="Rent, groceries, and who paid last time. Keep it all in one place, split it fairly, and know exactly who owes what. Dollars and riel included."
    orientation="vertical"
    :ui="{
      container: 'py-8 sm:py-16 lg:py-24 gap-8 sm:gap-12 lg:grid-cols-1',
      title: 'text-[2rem] leading-[1.15] sm:text-5xl lg:text-6xl lg:leading-[1.1]',
      description: 'mx-auto max-w-2xl text-sm sm:text-lg',
      footer: 'mt-6',
      links: 'w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3',
    }"
  >
    <template #headline>
      <UBadge variant="subtle" size="md" class="rounded-full">
        <span class="size-1.5 rounded-full bg-primary" />
        Made for shared living · Built for USD + KHR
      </UBadge>
    </template>

    <template #title>
      Share a home.<br />
      <span class="underline decoration-primary decoration-4 underline-offset-4">
        Not the money stress.
      </span>
    </template>

    <template #links>
      <UButton
        :label="primaryCta.label"
        :to="primaryCta.to"
        size="lg"
        class="flex justify-center sm:inline-flex"
      />

      <UButton
        to="#demo"
        label="Try interactive demo"
        icon="i-lucide-circle-play"
        color="neutral"
        variant="outline"
        size="lg"
        class="flex justify-center sm:inline-flex"
      />
    </template>

    <LandingDemo class="mx-auto w-full max-w-lg lg:max-w-5xl" />
  </UPageHero>
</template>
