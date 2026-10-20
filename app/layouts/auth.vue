<script setup lang="ts">
const route = useRoute();
const year = new Date().getFullYear();

const recovery = computed(
  () => route.path === "/forgot-password" || route.path === "/reset-password",
);
</script>

<template>
  <div
    class="flex min-h-dvh flex-col items-center justify-center bg-muted px-4 py-6 font-sans text-default sm:py-12"
  >
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>
