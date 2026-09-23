<script setup lang="ts">
definePageMeta({ layout: "landing" });

useHead({
  title: "Tricker — Shared bills, settled simply",
  meta: [
    {
      name: "description",
      content:
        "High-density multi-tenant household bill tracker. Parallel ledgers for USD and KHR with zero conversion drift, 10,000 bps split integrity, and automated settlement graphs.",
    },
  ],
});
</script>

<template>
  <div class="relative overflow-hidden bg-default text-default">
    <LandingHero />

    <LandingAppWindow />

    <LandingFeatures />

    <LandingWorkflow />

    <LandingCurrencies />

    <LandingRules />

    <LandingFaq />
  </div>
</template>
