<script setup lang="ts">
const { loggedIn, signOut } = useUserSession();
const route = useRoute();

const skipChrome = computed(() => {
  if (!loggedIn.value) return true;
  return (
    route.path.startsWith("/sign-") ||
    route.path.startsWith("/forgot-") ||
    route.path.startsWith("/reset-") ||
    route.path.startsWith("/onboarding") ||
    route.path.startsWith("/join") ||
    route.path === "/"
  );
});

const addItems = computed(() => [
  { label: "Bill", icon: "i-lucide-file-plus", to: "/bills/new" },
  { label: "Payment", icon: "i-lucide-coins", to: "/payments/new" },
]);

const menuItems = computed(() => [
  { label: "Dashboard", icon: "i-lucide-house", to: "/dashboard" },
  { label: "Recurring", icon: "i-lucide-repeat", to: "/recurring" },
  { label: "Categories", icon: "i-lucide-tag", to: "/categories" },
  { label: "Members", icon: "i-lucide-users", to: "/members" },
]);
</script>

<template>
  <div v-if="skipChrome" class="min-h-screen flex flex-col font-sans">
    <slot />
  </div>

  <div v-else class="min-h-screen flex flex-col font-sans">
    <UHeader
      title="Tricker"
      to="/dashboard"
      mode="drawer"
      :ui="{
        title: 'font-pixel-circle text-primary',
      }"
    >
      <UNavigationMenu :items="menuItems" :ui="{ link: 'justify-start', label: 'font-normal' }" />

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

      <template #body>
        <UNavigationMenu
          :items="menuItems"
          orientation="vertical"
          :ui="{ link: 'justify-start', label: 'font-normal' }"
        />
      </template>
    </UHeader>

    <main class="flex-1 pb-20">
      <slot />
    </main>

    <AppBottomNav />

    <UDropdownMenu
      :items="addItems"
      :content="{ side: 'top', align: 'center', sideOffset: 8 }"
      :ui="{ content: 'min-w-44' }"
    >
      <UButton
        icon="i-lucide-plus"
        color="primary"
        size="lg"
        class="fixed bottom-20 right-0 -translate-x-1/2 z-40 rounded-full shadow-lg"
        aria-label="Add"
      />
    </UDropdownMenu>
  </div>
</template>
