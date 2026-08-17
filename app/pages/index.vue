<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";

definePageMeta({ layout: "landing" });

const { loggedIn } = useUserSession();

const primaryCta = computed(() =>
  loggedIn.value
    ? { to: "/dashboard", label: "Go to dashboard" }
    : { to: "/sign-in", label: "Get started free" },
);

const ctaLinks = computed<ButtonProps[]>(() => [
  {
    label: primaryCta.value.label,
    color: "primary",
    size: "xl",
    trailingIcon: "i-lucide-arrow-right",
    to: primaryCta.value.to,
  },
]);

useHead({
  title: "Tricker — Shared bills, settled simply",
  meta: [
    {
      name: "description",
      content:
        "Multi-tenant household bill tracker. Each room is an independent household with its own members, bills, payments, and ledger.",
    },
  ],
});
</script>

<template>
  <div>
    <UPageHero orientation="horizontal">
      <template #headline>
        <UBadge label="Multi-tenant · USD + KHR" variant="subtle" size="lg" class="rounded-full" />
      </template>

      <template #title> Shared bills,<br />settled simply. </template>

      <template #description>
        One household ledger. Two currencies. Zero awkward "who owes who" conversations. Tricker
        turns every room into its own self-contained household with members, bills, and a month-end
        settlement that just works.
      </template>

      <template #links>
        <UButton
          :label="primaryCta.label"
          color="primary"
          size="xl"
          trailing-icon="i-lucide-arrow-right"
          :to="primaryCta.to"
        />
        <UButton
          label="See how it works"
          color="neutral"
          variant="subtle"
          size="xl"
          to="#how-it-works"
        />
      </template>

      <template #default>
        <UCard
          variant="subtle"
          :ui="{
            header: 'px-4 py-3',
            body: 'grid grid-cols-2 divide-x divide-default',
            footer: 'px-4 py-3',
          }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-primary">
                <span class="font-pixel-grid text-sm font-semibold">TRICKER</span>
              </div>
              <UBadge label="August 2026 · Open" variant="subtle" />
            </div>
          </template>

          <div class="p-5">
            <div class="text-xs uppercase tracking-wide text-muted mb-3">USD balances</div>
            <ul class="space-y-3 text-sm">
              <li class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <span class="size-2.5 rounded-full bg-primary-500" /> Seth
                </span>
                <span class="font-mono text-primary font-medium">+$45.00</span>
              </li>
              <li class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <span class="size-2.5 rounded-full bg-purple-500" /> Ly
                </span>
                <span class="font-mono text-error">-$30.00</span>
              </li>
              <li class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <span class="size-2.5 rounded-full bg-blue-500" /> Pich
                </span>
                <span class="font-mono text-error">-$15.00</span>
              </li>
            </ul>
          </div>

          <div class="p-5">
            <div class="text-xs uppercase tracking-wide text-muted mb-3">Recent</div>
            <ul class="space-y-3 text-sm">
              <li>
                <div class="font-medium">Rent</div>
                <div class="text-muted">$180 · paid by Seth · split 22/22/28/28</div>
              </li>
              <li>
                <div class="font-medium">Water bill</div>
                <div class="text-muted">$8.00 · paid by Pich · split all</div>
              </li>
              <li>
                <div class="font-medium">Morning groceries</div>
                <div class="text-muted">$12.50 · paid by Seth · split Seth, Ly</div>
              </li>
            </ul>
          </div>

          <template #footer>
            <div class="text-xs uppercase tracking-wide text-muted mb-2">
              Suggested transfers — minimum to settle
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm font-mono">
              <span>Ly → Seth <span class="text-primary">$30.00</span></span>
              <span>Pich → Seth <span class="text-primary">$15.00</span></span>
            </div>
          </template>
        </UCard>
      </template>
    </UPageHero>

    <UPageSection
      id="features"
      headline="Features"
      title="Everything a household needs"
      description="Purpose-built for shared living — from the first bill to month-end settlement."
      :ui="{ container: 'py-16 lg:py-20' }"
      :features="[
        {
          title: 'Per-room ledgers',
          description:
            'Each room is an independent household with its own members, bills, and history.',
          icon: 'i-lucide-door-open',
        },
        {
          title: 'Dual currency',
          description: 'Track USD and KHR side by side. No conversion — two parallel ledgers.',
          icon: 'i-lucide-coins',
        },
        {
          title: 'Flexible splits',
          description:
            'Equal, by-weight, or custom percentages. Edit any share, the total validates live.',
          icon: 'i-lucide-percent',
        },
        {
          title: 'Recurring bills',
          description:
            'Templates auto-draft each month with the current active members pre-filled.',
          icon: 'i-lucide-repeat',
        },
        {
          title: 'Smart settlement',
          description: 'A minimum-transfer graph per currency shows exactly who pays who.',
          icon: 'i-lucide-scale',
        },
        {
          title: 'Month lifecycle',
          description:
            'Open months stay editable; closing locks settlement with a full audit trail.',
          icon: 'i-lucide-calendar-check',
        },
      ]"
    />

    <UPageSection
      id="how-it-works"
      headline="How it works"
      title="From sign-up to settled, in four steps"
      description="No spreadsheets, no shared docs, no group-chat math."
      :ui="{ container: 'py-16 lg:py-20' }"
    >
      <UPageGrid class="lg:grid-cols-4">
        <UPageCard
          v-for="(step, i) in [
            {
              icon: 'i-lucide-user-plus',
              title: 'Create your room',
              desc: 'Name it, pick your currencies, and you are the admin.',
            },
            {
              icon: 'i-lucide-user-plus',
              title: 'Invite housemates',
              desc: 'Email invites or a share link for WhatsApp and Telegram.',
            },
            {
              icon: 'i-lucide-receipt',
              title: 'Log bills & payments',
              desc: 'Any member can log a bill; splits validate to 100%.',
            },
            {
              icon: 'i-lucide-handshake',
              title: 'Settle up',
              desc: 'Close the month and follow the suggested transfers.',
            },
          ]"
          :key="i"
          :icon="step.icon"
          :title="`${i + 1}. ${step.title}`"
          :description="step.desc"
          spotlight
        />
      </UPageGrid>
    </UPageSection>

    <UPageSection
      id="currencies"
      headline="Currencies"
      title="Two ledgers, zero conversion"
      description="USD and KHR live in parallel. Each gets its own balances and its own settlement plan, because mixing exchange rates into household math never ends well."
      orientation="horizontal"
      :ui="{ container: 'py-16 lg:py-20' }"
    >
      <div class="grid sm:grid-cols-2 gap-4">
        <UPageCard
          icon="i-lucide-dollar-sign"
          title="USD"
          description="Cents-precise. Displayed as $1,234.56."
          spotlight
        />
        <UPageCard
          icon="i-lucide-banknote"
          title="KHR"
          description="No subunit. Displayed as ៛1,234,567."
          spotlight
        />
      </div>
    </UPageSection>

    <UPageCTA
      title="Ready to settle simply?"
      description="Create your room, invite your housemates, and close out your first month — all in one sitting."
      variant="soft"
      :ui="{ container: 'py-16 lg:py-24' }"
      :links="ctaLinks"
    />
  </div>
</template>
