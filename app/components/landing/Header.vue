<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { loggedIn } = useUserSession();
const menuOpen = ref(false);

const primaryCta = computed(() =>
  loggedIn.value
    ? { to: "/rooms", label: "Go to your rooms" }
    : { to: "/sign-up", label: "Get started" },
);

const navItems: NavigationMenuItem[] = [
  { label: "How it works", to: "#how-it-works", icon: "i-lucide-list-checks" },
  { label: "Features", to: "#features", icon: "i-lucide-layout-grid" },
  { label: "USD + KHR", to: "#currencies", icon: "i-lucide-coins" },
];

const mobileNavItems: NavigationMenuItem[] = [
  ...navItems,
  { label: "Try the demo", to: "#app-window", icon: "i-lucide-mouse-pointer-2" },
  { label: "Common questions", to: "#faq", icon: "i-lucide-message-circle" },
].map((item) => ({ ...item, onSelect: () => (menuOpen.value = false) }));
</script>

<template>
  <UHeader
    v-model:open="menuOpen"
    title="Tricker"
    mode="slideover"
    :toggle="{ size: 'md', class: 'size-9 justify-center' }"
    :ui="{
      root: 'h-18 bg-default/90 backdrop-blur-md',
      title: 'items-center gap-2.5',
      right: 'gap-2',
      header: 'h-18 border-b border-default',
      body: 'flex flex-col gap-8 py-6',
    }"
  >
    <template #title>
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-neutral-900"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-house" class="size-5" />
      </span>
      <span class="text-xl font-bold tracking-tight select-none"
        >Tricker<span class="text-muted">.</span></span
      >
    </template>

    <UNavigationMenu
      :items="navItems"
      variant="link"
      color="neutral"
      aria-label="Main navigation"
      :ui="{
        list: 'gap-1',
        link: 'px-3 py-2 text-sm',
        linkLeadingIcon: 'size-5 text-muted',
      }"
    />

    <template #right>
      <UColorModeButton color="neutral" variant="ghost" size="md" class="size-9 justify-center" />
      <span class="mx-1 hidden h-5 w-px bg-accented lg:block" aria-hidden="true" />
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
      <div>
        <p class="mb-3 font-mono text-xs tracking-wider text-muted uppercase">Explore Tricker</p>
        <UNavigationMenu
          :items="mobileNavItems"
          orientation="vertical"
          variant="link"
          color="neutral"
          aria-label="Mobile navigation"
          :ui="{
            list: 'gap-1',
            link: 'px-3 py-3 text-base',
            linkLeadingIcon: 'size-5 text-muted',
          }"
        />
      </div>

      <div class="rounded-lg border border-default bg-muted/40 p-5">
        <p class="text-sm font-semibold text-highlighted">A home for your shared bills.</p>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Fair shares. Clear balances. Less group-chat math.
        </p>
        <div class="mt-5 flex flex-col gap-2">
          <UButton
            :to="primaryCta.to"
            :label="primaryCta.label"
            trailing-icon="i-lucide-arrow-right"
            class="text-neutral-900"
            block
            @click="menuOpen = false"
          />
          <UButton
            v-if="!loggedIn"
            to="/sign-in"
            label="Already have an account? Sign in"
            color="neutral"
            variant="ghost"
            block
            @click="menuOpen = false"
          />
        </div>
      </div>
    </template>
  </UHeader>
</template>
