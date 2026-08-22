<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { signOut } = useUserSession();

const route = useRoute();
const roomId = computed(() => (route.params.roomId as string | undefined) ?? "");

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    icon: "i-lucide-house",
    label: "Home",
    to: `/rooms/${roomId.value}/dashboard`,
  },
  {
    icon: "i-lucide-users",
    label: "People",
    to: `/rooms/${roomId.value}/members`,
  },
  {
    icon: "i-lucide-scale",
    label: "Settle",
    to: `/rooms/${roomId.value}/settle/${monthKey()}`,
  },
  { icon: "i-lucide-tag", label: "Categories", to: `/rooms/${roomId.value}/categories` },
  { icon: "i-lucide-receipt", label: "Entries", to: `/rooms/${roomId.value}/entries` },
]);
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans">
    <UHeader
      title="Tricker"
      :toggle="false"
      :ui="{
        title: 'font-pixel-circle text-primary',
      }"
    >
      <template #right>
        <RoomSwitcher />

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

    <UNavigationMenu
      :items="navItems"
      :ui="{
        root: 'fixed bottom-0 left-0 right-0 z-30 bg-default border-t border-default',
        list: 'w-screen py-2 px-4 sm:px-6 lg:px-8',
        item: 'flex-1 py-0',
        link: 'flex-col gap-1 px-3',
        linkLeadingIcon: 'size-5',
        linkLabel: 'text-[10px]/3 font-normal',
      }"
    />

    <UButton
      icon="i-lucide-plus"
      size="lg"
      class="fixed bottom-20 right-0 -translate-x-1/2 z-40 rounded-full shadow-lg"
      :to="`/rooms/${roomId}/entries/new`"
    />
  </div>
</template>
