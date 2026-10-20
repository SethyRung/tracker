<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { signOut } = useUserSession();

const route = useRoute();
const roomId = computed(() => (route.params.roomId as string | undefined) ?? "");
const hasRoom = computed(() => roomId.value.length > 0);

const navItems = computed<NavigationMenuItem[]>(() => {
  if (!hasRoom.value) return [];
  const id = roomId.value;

  return [
    { icon: "i-lucide-house", label: "Home", to: `/rooms/${id}/dashboard` },
    { icon: "i-lucide-users", label: "People", to: `/rooms/${id}/members` },
    { icon: "i-lucide-scale", label: "Settle", to: `/rooms/${id}/settle/${monthKey()}` },
    { icon: "i-lucide-tag", label: "Categories", to: `/rooms/${id}/categories` },
    { icon: "i-lucide-receipt", label: "Entries", to: `/rooms/${id}/entries` },
  ];
});
</script>

<template>
  <div class="bg-default font-sans text-default">
    <UHeader title="Tricker" to="/rooms" :toggle="false">
      <UNavigationMenu
        v-if="hasRoom"
        :items="navItems"
        color="primary"
        variant="link"
        highlight
        class="hidden lg:flex"
        :ui="{ link: 'px-2.5 py-1.5', linkLeadingIcon: 'size-4' }"
      />

      <template #right>
        <RoomSwitcher />

        <UButton
          icon="i-lucide-user"
          to="/account"
          color="neutral"
          variant="ghost"
          aria-label="Account"
        />

        <UColorModeButton color="neutral" variant="ghost" />

        <UButton
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          aria-label="Sign out"
          @click="signOut()"
        />
      </template>
    </UHeader>

    <UMain class="py-8 sm:py-12">
      <slot />
    </UMain>

    <UNavigationMenu
      v-if="hasRoom"
      :items="navItems"
      color="primary"
      variant="link"
      class="lg:hidden"
      :ui="{
        root: 'fixed inset-x-0 bottom-0 z-30 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md',
        list: 'w-full px-2 py-1.5',
        item: 'min-w-0 flex-1 py-0',
        link: 'flex-col gap-1 px-1',
        linkLeadingIcon: 'size-5',
        linkLabel: 'text-xs font-medium',
      }"
    />
  </div>
</template>
