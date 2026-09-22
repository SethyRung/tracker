<template>
  <div class="min-h-dvh font-sans flex flex-col bg-default text-default">
    <LandingHeader />

    <UMain class="flex-1">
      <slot />
    </UMain>

    <LandingFooter />
  </div>
</template>
