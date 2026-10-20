<script setup lang="ts">
const { loggedIn } = useUserSession();

const primaryCta = computed(() =>
  loggedIn.value
    ? { to: "/rooms", label: "Go to your rooms" }
    : { to: "/sign-up", label: "Start your household" },
);
</script>

<template>
  <UPageCTA
    title="Ready to simplify roommate life?"
    description="Create a room, invite your housemates, and settle up without the spreadsheet."
    variant="solid"
    orientation="vertical"
    :ui="{
      root: 'mx-4 my-6 rounded-lg sm:mx-6 sm:my-16 lg:mx-auto lg:my-24 lg:max-w-5xl',
      container: 'px-5 py-6 gap-4 sm:px-12 sm:py-16',
      title: 'text-xl sm:text-4xl',
      description: 'text-sm sm:text-lg',
      footer: 'mt-4 sm:mt-8',
    }"
  >
    <template #links>
      <UButton
        :to="primaryCta.to"
        :label="primaryCta.label"
        trailing-icon="i-lucide-arrow-right"
        size="lg"
        class="w-full justify-center text-neutral-900 sm:w-auto"
      />
    </template>
  </UPageCTA>
</template>
