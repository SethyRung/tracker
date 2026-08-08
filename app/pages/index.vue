<script setup lang="ts">
definePageMeta({
  auth: { only: "guest", redirectTo: "/dashboard" },
});

useHead({
  title: "Tricker — Shared bills, settled simply",
  meta: [
    {
      name: "description",
      content:
        "Multi-tenant household bill tracker. Each room is an independent household with its own members, bills, payments, and ledger.",
    },
  ],
});
</script>

<template>
  <div class="flex flex-1 items-center justify-center p-4">
    <UCard class="w-full max-w-md text-center">
      <h1 class="font-pixel-circle text-4xl text-primary">Tricker</h1>
      <p class="mt-2 text-toned">Shared bills, settled simply.</p>

      <div class="mt-6 flex justify-center gap-3">
        <UButton color="primary" to="/sign-up"> Sign up </UButton>
        <UButton color="neutral" variant="outline" to="/sign-in"> Sign in </UButton>
      </div>
    </UCard>
  </div>
</template>
