<template>
  <div class="flex min-h-dvh flex-col bg-default font-sans text-default">
    <LandingHeader />

    <UMain class="flex-1">
      <slot />
    </UMain>

    <LandingFooter />
  </div>
</template>
