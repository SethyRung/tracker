<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { signOut } = useUserSession();
const { currentRoomId } = useRoomMemberships();

const route = useRoute();
const roomId = computed(() => (route.params.roomId as string | undefined) ?? "");
const hasRoom = computed(() => roomId.value.length > 0);

const navItems = computed(() => [
  { icon: "i-lucide-layout-dashboard", label: "Overview", to: `/rooms/${roomId.value}/dashboard` },
  { icon: "i-lucide-receipt-text", label: "Ledger", to: `/rooms/${roomId.value}/entries` },
  { icon: "i-lucide-shapes", label: "Categories", to: `/rooms/${roomId.value}/categories` },
  { icon: "i-lucide-users", label: "Members", to: `/rooms/${roomId.value}/members` },
]);
</script>

<template>
  <div class="bg-default font-sans text-default">
    <UHeader to="/rooms" :toggle="false" :ui="{ left: 'min-w-0 flex-1', right: 'shrink-0' }">
      <template #left>
        <NuxtLink to="/rooms" class="pr-2.5 text-xl font-bold text-highlighted"> Tricker </NuxtLink>

        <USeparator orientation="vertical" class="h-8" />

        <RoomSwitcher />
      </template>

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

    <UMain class="pt-8 sm:pt-12" :class="hasRoom ? 'pb-24 sm:pb-28 lg:pb-12' : 'pb-8 sm:pb-12'">
      <slot />
    </UMain>

    <nav
      v-if="hasRoom"
      aria-label="Room navigation"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div class="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        <template v-for="(item, index) in navItems" :key="item.to">
          <NuxtLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
            <a
              :href="href ?? undefined"
              :aria-current="isActive ? 'page' : undefined"
              class="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:active:scale-90"
              :class="isActive ? 'text-primary' : 'text-dimmed hover:text-default'"
              @click="navigate"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
              <span
                class="text-[10px] leading-none tracking-tight min-[360px]:text-xs"
                :class="isActive ? 'font-bold' : 'font-medium'"
                >{{ item.label }}</span
              >
              <span
                class="size-1 rounded-full"
                :class="isActive ? 'bg-primary' : 'bg-transparent'"
                aria-hidden="true"
              />
            </a>
          </NuxtLink>

          <div v-if="index === 1" class="-mt-6 flex items-center justify-center">
            <UButton
              :to="`/rooms/${roomId}/entries?new=true`"
              icon="i-lucide-plus"
              aria-label="Add new bill"
              class="size-12 justify-center rounded-full border-4 border-default p-0 text-highlighted shadow-md motion-safe:transition-transform motion-safe:active:scale-90"
              :ui="{ leadingIcon: 'size-6' }"
            />
          </div>
        </template>
      </div>
    </nav>
  </div>
</template>
