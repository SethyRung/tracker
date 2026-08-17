<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const items = computed<NavigationMenuItem[]>(() => [
  { label: "Features", to: "#features" },
  { label: "How it works", to: "#how-it-works" },
  { label: "Currencies", to: "#currencies" },
]);

const { loggedIn } = useUserSession();

const authCta = computed(() =>
  loggedIn.value
    ? { to: "/dashboard", label: "Go to dashboard" }
    : { to: "/sign-in", label: "Get started" },
);

const year = new Date().getFullYear();
</script>

<template>
  <div class="min-h-dvh font-sans flex flex-col bg-default text-default">
    <UHeader
      :toggle="{ icon: 'i-lucide-menu', color: 'neutral', variant: 'ghost' }"
      mode="slideover"
      :ui="{ root: 'border-default' }"
    >
      <template #title>
        <NuxtLink to="/" class="flex items-center gap-2 text-primary">
          <span class="font-pixel-grid text-2xl font-semibold tracking-tight">TRICKER</span>
        </NuxtLink>
      </template>

      <UNavigationMenu :items="items" variant="link" />

      <template #right>
        <UColorModeButton />

        <UButton
          :label="authCta.label"
          color="primary"
          trailing-icon="i-lucide-arrow-right"
          :to="authCta.to"
        />
      </template>

      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <UFooter :ui="{ root: 'border-default' }">
      <template #left>
        <p class="text-muted text-sm mt-1">© {{ year }} Tricker. Shared bills, settled simply.</p>
      </template>

      <template #right>
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/SethyRung/tracker"
          target="_blank"
          aria-label="GitHub"
        />
      </template>
    </UFooter>
  </div>
</template>
