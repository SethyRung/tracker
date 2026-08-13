<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { signOut } = useUserSession();

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    icon: "i-lucide-house",
    label: "Home",
    to: "/dashboard",
  },
  {
    icon: "i-lucide-users",
    label: "People",
    to: "/members",
  },
  {
    icon: "i-lucide-scale",
    label: "Settle",
    to: `/settle/${monthKey()}`,
  },
  { label: "Categories", icon: "i-lucide-tag", to: "/categories" },
  { label: "Entries", icon: "i-lucide-receipt", to: "/entries" },
  { label: "Recurring", icon: "i-lucide-repeat", to: "/recurring" },
]);
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans">
    <UHeader
      title="Tricker"
      to="/dashboard"
      :toggle="false"
      :ui="{
        title: 'font-pixel-circle text-primary',
      }"
    >
      <template #right>
        <UColorModeButton />

        <UButton
          icon="i-lucide-log-out"
          label="Sign Out"
          color="neutral"
          variant="ghost"
          @click="signOut()"
          :ui="{ label: 'hidden lg:block' }"
        />
      </template>
    </UHeader>

    <main class="flex-1 pb-20">
      <slot />
    </main>

    <nav class="fixed bottom-0 left-0 right-0 z-30 bg-default border-t border-default">
      <UNavigationMenu
        :items="navItems"
        :ui="{
          root: 'justify-around py-2',
          item: 'py-0',
          link: 'flex-col gap-1 px-3',
          linkLeadingIcon: 'size-5',
          linkLabel: 'text-[10px]/3 font-normal',
        }"
      />
    </nav>

    <UButton
      icon="i-lucide-plus"
      color="primary"
      size="lg"
      class="fixed bottom-20 right-0 -translate-x-1/2 z-40 rounded-full shadow-lg"
      to="/entries/new"
    />
  </div>
</template>
