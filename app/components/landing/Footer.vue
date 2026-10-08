<script setup lang="ts">
const { loggedIn } = useUserSession();
const year = new Date().getFullYear();

const productLinks = [
  { label: "How it works", to: "#how-it-works" },
  { label: "Features", to: "#features" },
  { label: "USD + KHR", to: "#currencies" },
  { label: "Common questions", to: "#faq" },
];

const householdLinks = computed(() =>
  loggedIn.value
    ? [
        { label: "Your rooms", to: "/rooms" },
        { label: "Your account", to: "/account" },
        { label: "Try the demo", to: "#app-window" },
      ]
    : [
        { label: "Create an account", to: "/sign-up" },
        { label: "Sign in", to: "/sign-in" },
        { label: "Try the demo", to: "#app-window" },
      ],
);
</script>

<template>
  <UFooter
    :ui="{
      root: 'border-t border-default bg-muted/30',
      top: 'py-12 sm:py-16',
      container: 'flex flex-col gap-4 border-t border-default py-5 sm:flex-row sm:justify-between',
      left: 'mt-0 justify-start lg:flex-none',
      right: 'justify-start lg:flex-none',
    }"
  >
    <template #top>
      <UContainer>
        <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div class="lg:col-span-6">
            <NuxtLink
              to="/"
              aria-label="Tricker home"
              class="inline-flex items-center gap-3 rounded-md outline-primary/50 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-neutral-900"
                aria-hidden="true"
              >
                <UIcon name="i-lucide-house" class="size-5" />
              </span>
              <span class="text-2xl font-bold tracking-tight text-highlighted"
                >Tricker<span class="text-muted">.</span></span
              >
            </NuxtLink>
            <p class="mt-5 max-w-sm text-lg font-medium tracking-tight text-highlighted">
              Shared bills. A little less friction.
            </p>
            <p class="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Built for the everyday money of living together. Keep your dollars and riel separate,
              and your household on the same page.
            </p>
            <div
              class="mt-5 inline-flex items-center gap-3 rounded-md border border-default bg-default px-3 py-2 text-xs text-toned"
            >
              <span class="font-mono">USD</span>
              <span class="h-3 w-px bg-accented" aria-hidden="true" />
              <span class="font-mono">KHR</span>
              <span class="text-muted">Never mixed.</span>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            class="grid grid-cols-2 gap-6 lg:col-span-6 lg:gap-10"
          >
            <div>
              <h2 class="font-mono text-xs tracking-wider text-toned uppercase">Explore</h2>
              <ul class="mt-4 space-y-1">
                <li v-for="link in productLinks" :key="link.to">
                  <UButton
                    :to="link.to"
                    :label="link.label"
                    color="neutral"
                    variant="link"
                    class="px-0 py-2 text-sm text-muted hover:text-highlighted"
                  />
                </li>
              </ul>
            </div>
            <div>
              <h2 class="font-mono text-xs tracking-wider text-toned uppercase">Your household</h2>
              <ul class="mt-4 space-y-1">
                <li v-for="link in householdLinks" :key="link.to">
                  <UButton
                    :to="link.to"
                    :label="link.label"
                    color="neutral"
                    variant="link"
                    class="px-0 py-2 text-sm text-muted hover:text-highlighted"
                    :ui="{ label: 'whitespace-normal text-left' }"
                  />
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </UContainer>
    </template>

    <template #left>
      <p class="text-xs text-muted">© {{ year }} Tricker. Shared bills, settled simply.</p>
    </template>

    <template #right>
      <UButton
        to="https://github.com/SethyRung/tracker"
        target="_blank"
        rel="noopener noreferrer"
        icon="i-simple-icons-github"
        label="Open source on GitHub"
        trailing-icon="i-lucide-arrow-up-right"
        color="neutral"
        variant="link"
        size="sm"
        class="p-0 text-muted hover:text-highlighted"
      />
    </template>
  </UFooter>
</template>
