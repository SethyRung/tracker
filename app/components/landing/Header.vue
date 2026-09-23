<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { loggedIn } = useUserSession();

const navItems = computed<NavigationMenuItem[]>(() => [
  { label: "Features", to: "#features" },
  { label: "How it works", to: "#how-it-works" },
  { label: "Currencies", to: "#currencies" },
]);
</script>

<template>
  <UHeader title="Tricker" mode="slideover" :ui="{ root: 'backdrop-blur-md' }">
    <template #title>
      <NuxtLink to="/" class="select-none">
        <span class="text-xl font-bold tracking-tight text-highlighted">
          Tricker<span class="text-primary">.</span>
        </span>
      </NuxtLink>
    </template>

    <UNavigationMenu :items="navItems" variant="link" />

    <template #right>
      <div class="flex items-center gap-1.5">
        <UColorModeButton />

        <div class="hidden items-center gap-2 lg:flex">
          <template v-if="loggedIn">
            <UButton to="/rooms" label="Go to app" size="sm" trailing-icon="i-lucide-arrow-right" />
          </template>

          <template v-else>
            <UButton to="/sign-in" label="Sign in" variant="ghost" color="neutral" size="sm" />
            <UButton
              to="/sign-up"
              label="Get started"
              size="sm"
              trailing-icon="i-lucide-arrow-right"
            />
          </template>
        </div>
      </div>
    </template>

    <template #content="{ close }">
      <div class="flex h-full flex-col bg-default">
        <div
          class="flex h-(--ui-header-height) shrink-0 items-center justify-between gap-3 border-b border-default px-4 sm:px-6"
        >
          <NuxtLink to="/" class="select-none" @click="close">
            <span class="text-xl font-bold tracking-tight text-highlighted">
              Tricker<span class="text-primary">.</span>
            </span>
          </NuxtLink>

          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            aria-label="Close menu"
            @click="close"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6" @click="close">
          <UNavigationMenu
            :items="navItems"
            orientation="vertical"
            variant="link"
            :ui="{ link: 'text-base px-3 py-2.5' }"
          />
        </div>

        <div class="flex shrink-0 flex-col gap-2 border-t border-default p-4 sm:p-6">
          <template v-if="loggedIn">
            <UButton to="/rooms" label="Go to app" block />
          </template>

          <template v-else>
            <UButton to="/sign-in" label="Sign in" variant="outline" color="neutral" block />

            <UButton to="/sign-up" label="Get started" block />
          </template>
        </div>
      </div>
    </template>
  </UHeader>
</template>
