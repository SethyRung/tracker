<script setup lang="ts">
definePageMeta({ layout: "landing" });

useHead({
  htmlAttrs: { lang: "en" },
  title: "Tricker — Shared bills, settled simply",
  meta: [
    {
      name: "description",
      content:
        "Share a home, not the money stress. Track household bills, split costs fairly, and settle up with separate USD and KHR ledgers. No currency conversion.",
    },
  ],
});
</script>

<template>
  <LandingHero />
  <LandingCurrencies />
  <LandingFeatures />
  <LandingWorkflow />
  <LandingFaq />
  <LandingCta />
</template>
