<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const year = new Date().getFullYear();

const links: NavigationMenuItem[] = [
  { label: "How it works", to: "#how-it-works" },
  { label: "Features", to: "#features" },
  { label: "USD + KHR", to: "#currencies" },
  { label: "FAQ", to: "#faq" },
];
</script>

<template>
  <UFooter
    :ui="{
      root: 'border-t border-default bg-default',
      top: 'py-8 lg:py-12',
      container: 'py-5',
    }"
  >
    <template #top>
      <UContainer>
        <div
          class="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-start lg:justify-between lg:text-left"
        >
          <div class="max-w-sm">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 rounded-md outline-primary/50 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span class="text-base font-bold tracking-tight text-highlighted">Tricker</span>
            </NuxtLink>
            <p class="mt-3 text-sm leading-relaxed text-muted">
              Shared bills, settled simply. Parallel USD and KHR ledgers.
            </p>
          </div>

          <UNavigationMenu
            :items="links"
            orientation="vertical"
            color="neutral"
            variant="link"
            class="lg:hidden"
          />
          <UNavigationMenu :items="links" color="neutral" variant="link" class="hidden lg:flex" />
        </div>
      </UContainer>
    </template>

    <template #left>
      <p class="text-xs text-muted">© {{ year }} Tricker. Built for shared living.</p>
    </template>

    <p class="font-mono text-xs text-dimmed">Separate rooms · USD + KHR</p>

    <template #right>
      <UColorModeButton color="neutral" variant="ghost" size="sm" class="sm:hidden" />
      <UButton
        to="https://github.com/SethyRung/tracker"
        target="_blank"
        icon="i-simple-icons-github"
        label="Open source"
        color="neutral"
        variant="ghost"
        size="sm"
      />
    </template>
  </UFooter>
</template>
