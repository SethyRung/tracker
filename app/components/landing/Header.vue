<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { loggedIn } = useUserSession();
const menuOpen = ref(false);

const primaryCta = computed(() =>
  loggedIn.value ? { to: "/rooms", label: "Your rooms" } : { to: "/sign-up", label: "Get started" },
);

const navItems: NavigationMenuItem[] = [
  { label: "How it works", to: "#how-it-works" },
  { label: "Features", to: "#features" },
  { label: "USD + KHR", to: "#currencies" },
  { label: "FAQ", to: "#faq" },
];
</script>

<template>
  <UHeader
    v-model:open="menuOpen"
    title="Tricker"
    mode="slideover"
    :toggle="{ size: 'md', class: 'size-9 justify-center' }"
    :ui="{
      root: 'border-b border-default bg-default/95 backdrop-blur-md',
      right: 'gap-1.5',
    }"
  >
    <UNavigationMenu :items="navItems" color="neutral" variant="link" />

    <template #right>
      <UColorModeButton color="neutral" variant="ghost" size="md" class="size-9 justify-center" />

      <span class="mx-1 hidden h-5 w-px bg-accented lg:block" />

      <UButton
        v-if="!loggedIn"
        to="/sign-in"
        label="Sign in"
        color="neutral"
        variant="ghost"
        size="md"
        class="hidden h-9 justify-center px-3 lg:inline-flex"
      />

      <UButton
        :to="primaryCta.to"
        :label="primaryCta.label"
        trailing-icon="i-lucide-arrow-right"
        size="md"
        class="hidden h-9 justify-center px-3 text-neutral-900 sm:inline-flex"
      />
    </template>

    <template #body>
      <p class="mb-3 font-mono text-xs tracking-wider text-muted uppercase">Explore Tricker</p>

      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        variant="link"
        color="neutral"
        :ui="{
          list: 'gap-1',
          link: 'px-3 py-3 text-base',
          linkLeadingIcon: 'size-5 text-muted',
        }"
      />
    </template>
  </UHeader>
</template>
