<script setup lang="ts">
const faqs = [
  {
    label: "Why does Tricker maintain two parallel ledgers instead of converting?",
    content:
      "In dual-currency economies like Cambodia, household expenses naturally split between USD (rent, broadband, major services) and KHR (markets, dining, local utilities). Applying fluctuating exchange rates creates unfair currency conversion loss and roommate disputes. Parallel ledgers keep math objective.",
  },
  {
    label: "How does the minimum-transfer settlement graph work?",
    content:
      "At month-end, Tricker aggregates all payments and shares per person to compute net creditors (those who get back money) and net debtors (those who owe). It runs a greedy min-flow algorithm to match balances, minimizing the total number of peer-to-peer payments required.",
  },
  {
    label: "Can we split a bill unevenly?",
    content:
      "Yes. Every entry supports custom weighting. Whether one housemate pays 40% and two others pay 30%, or specific housemates are excluded from a particular bill, the live validator ensures the total equals exactly 10,000 basis points (100.00%).",
  },
  {
    label: "What happens when an admin closes a month?",
    content:
      "Closing creates an immutable record. All entries are locked against edits or deletions, and the suggested settlement transfers are frozen as the final resolution plan for that billing cycle.",
  },
  {
    label: "How do recurring bill templates work?",
    content:
      "Templates store predefined repeating amounts and split rules. At 00:00 ICT on the 1st of each month, Tricker's background cron task materializes published entries for the new month with active household members pre-filled.",
  },
];
</script>

<template>
  <section id="faq" class="scroll-mt-20 border-t border-default py-12 sm:py-20 lg:py-24">
    <UContainer>
      <div class="grid gap-10 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <p class="font-mono text-xs tracking-wider text-toned uppercase">Questions</p>
          <h2 class="mt-2 font-sans text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
            Frequently asked questions.
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-muted">
            Clear answers regarding room borders, bps arithmetic, and month freeze mechanics.
          </p>
        </div>
        <div class="lg:col-span-8">
          <UAccordion
            :items="faqs"
            :ui="{
              trigger: 'hover:text-primary py-4',
              body: 'text-sm text-muted',
            }"
          />
        </div>
      </div>
    </UContainer>
  </section>
</template>
