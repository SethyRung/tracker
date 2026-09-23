<script setup lang="ts">
const { loggedIn } = useUserSession();

const primaryCta = computed(() =>
  loggedIn.value
    ? { to: "/rooms", label: "Open Household" }
    : { to: "/sign-up", label: "Get Started Free" },
);
</script>

<template>
  <section class="pt-16 sm:pt-24 lg:pt-32">
    <UContainer>
      <div class="max-w-3xl">
        <div class="mb-5 flex flex-wrap items-center gap-2 sm:mb-6">
          <UBadge
            label="Multi-Tenant Household Clearinghouse"
            variant="subtle"
            class="max-w-full text-center font-mono text-2xs whitespace-normal sm:text-xs"
          />

          <span class="hidden font-mono text-xs tracking-wider text-toned uppercase sm:inline">
            USD · KHR · Phnom Penh
          </span>
        </div>

        <h1
          class="font-sans text-3xl leading-[1.15] font-bold tracking-tight text-highlighted sm:text-6xl lg:text-[4.25rem]"
        >
          The dual-currency ledger for

          <span class="text-primary">shared households.</span>
        </h1>

        <p class="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:mt-6 sm:text-xl">
          USD cents and KHR riel run on parallel ledgers with zero conversion guesswork. Track
          roommate expenses, enforce 10,000 bps split integrity, and settle month-end in the fewest
          transfers.
        </p>

        <div
          class="mt-7 flex flex-col items-stretch gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
        >
          <UButton
            :label="primaryCta.label"
            :to="primaryCta.to"
            size="lg"
            trailing-icon="i-lucide-arrow-right"
            class="justify-center font-medium"
          />

          <UButton
            label="Explore Live Window"
            to="#app-window"
            color="neutral"
            variant="outline"
            size="lg"
            trailing-icon="i-lucide-arrow-down"
            class="justify-center"
          />
        </div>
      </div>
    </UContainer>

    <div class="mt-10 border-y border-default sm:mt-16">
      <UContainer>
        <dl class="grid grid-cols-2 gap-x-3 gap-y-5 py-5 sm:grid-cols-4 sm:gap-8 sm:py-6">
          <div>
            <dt class="font-mono text-2xs tracking-wider text-toned uppercase sm:text-xs">
              Parallel Ledgers
            </dt>

            <dd class="mt-1 font-mono text-lg font-bold text-highlighted tabular-nums sm:text-2xl">
              USD + KHR
            </dd>

            <p class="mt-0.5 text-2xs text-muted sm:text-xs">Never converted or mixed</p>
          </div>

          <div>
            <dt class="font-mono text-2xs tracking-wider text-toned uppercase sm:text-xs">
              Split Engine
            </dt>

            <dd class="mt-1 font-mono text-lg font-bold text-highlighted tabular-nums sm:text-2xl">
              10,000 bps
            </dd>

            <p class="mt-0.5 text-2xs text-muted sm:text-xs">100.00% exact validation</p>
          </div>

          <div>
            <dt class="font-mono text-2xs tracking-wider text-toned uppercase sm:text-xs">
              Settlement
            </dt>

            <dd class="mt-1 font-mono text-lg font-bold text-highlighted tabular-nums sm:text-2xl">
              Min-Transfer
            </dd>

            <p class="mt-0.5 text-2xs text-muted sm:text-xs">Directed graph reduction</p>
          </div>

          <div>
            <dt class="font-mono text-2xs tracking-wider text-toned uppercase sm:text-xs">
              Recurring Cron
            </dt>
            <dd class="mt-1 font-mono text-lg font-bold text-highlighted tabular-nums sm:text-2xl">
              00:00 ICT
            </dd>
            <p class="mt-0.5 text-2xs text-muted sm:text-xs">1st-of-month auto-post</p>
          </div>
        </dl>
      </UContainer>
    </div>
  </section>
</template>
