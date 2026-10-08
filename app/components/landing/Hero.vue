<script setup lang="ts">
const { loggedIn } = useUserSession();

const primaryCta = computed(() =>
  loggedIn.value
    ? { to: "/rooms", label: "Go to your rooms" }
    : { to: "/sign-up", label: "Start your household" },
);

const benefits = [
  { icon: "i-lucide-coins", label: "USD & KHR, kept separate" },
  { icon: "i-lucide-users", label: "Fair splits for everyone" },
  { icon: "i-lucide-arrow-right-left", label: "Clear steps to settle up" },
];
</script>

<template>
  <section class="relative border-b border-default">
    <UContainer class="relative pt-12 pb-10 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-16">
      <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-10 xl:gap-16">
        <div>
          <div class="mb-6 flex items-center gap-2 text-xs font-medium text-toned">
            <span class="size-2 rounded-full bg-primary" aria-hidden="true" />
            Made for shared living. Built for USD + KHR.
          </div>

          <h1
            class="max-w-xl text-4xl leading-[1.1] font-bold tracking-tight text-highlighted sm:text-6xl xl:text-7xl"
          >
            Share a home.<br />
            Not the
            <span
              class="underline decoration-primary decoration-4 underline-offset-4 dark:text-primary dark:no-underline"
              >money stress.</span
            >
          </h1>

          <p class="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Rent, groceries, and who paid last time. Keep it all in one place, split it fairly, and
            know exactly who owes what. Dollars and riel included.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <UButton
              :label="primaryCta.label"
              :to="primaryCta.to"
              size="xl"
              trailing-icon="i-lucide-arrow-right"
              class="justify-center text-neutral-900"
            />
            <UButton
              label="Try the demo"
              to="#app-window"
              icon="i-lucide-mouse-pointer-2"
              color="neutral"
              variant="ghost"
              size="xl"
              class="justify-center"
            />
          </div>

          <p class="mt-4 text-xs text-muted">Less spreadsheet. More living together.</p>
        </div>

        <div class="relative min-w-0">
          <div
            class="absolute -inset-3 -z-0 rounded-2xl border border-default bg-muted/40 sm:-inset-5"
            aria-hidden="true"
          />
          <LandingAppWindow class="relative" />
          <p class="relative mt-6 text-center font-mono text-xs text-muted">
            A little preview of a calmer month-end.
          </p>
        </div>
      </div>

      <ul class="mt-12 grid gap-4 border-t border-default pt-6 sm:grid-cols-3 lg:mt-16">
        <li
          v-for="benefit in benefits"
          :key="benefit.label"
          class="flex items-center gap-2.5 text-sm text-toned"
        >
          <UIcon :name="benefit.icon" class="size-4 shrink-0 text-toned" />
          {{ benefit.label }}
        </li>
      </ul>
    </UContainer>
  </section>
</template>
