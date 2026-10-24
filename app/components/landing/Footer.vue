<script setup lang="ts">
const year = new Date().getFullYear();

const links = [
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
      top: 'py-6 lg:py-12',
      container:
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-default py-4 lg:flex lg:py-5',
      left: 'col-start-1 row-start-1 mt-0 justify-start',
      center: 'hidden lg:flex',
      right: 'col-start-2 row-start-1 justify-end',
    }"
  >
    <template #top>
      <UContainer>
        <div class="flex flex-col items-start gap-3 lg:flex-row lg:justify-between lg:gap-5">
          <div class="max-w-xs">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 rounded-md outline-primary/50 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span class="text-base font-bold tracking-tight text-highlighted">Tricker</span>
            </NuxtLink>
            <p class="mt-2 text-sm text-balance text-muted">
              Shared bills, settled simply. Parallel USD and KHR ledgers.
            </p>
          </div>

          <nav class="hidden items-center gap-x-6 lg:flex" aria-label="Footer">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="inline-flex min-h-11 items-center rounded-md text-sm text-muted hover:text-default focus-visible:outline-2 focus-visible:outline-primary"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
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
        aria-label="Open source on GitHub"
        :ui="{ label: 'hidden sm:inline' }"
      />
    </template>
  </UFooter>
</template>
