<script setup lang="ts">
const faqs = [
  {
    label: "Can we use both dollars and riel?",
    content:
      "Yes. Track USD and KHR in the same room. Each currency has its own totals and settlement plan, so you pay back in the currency that was spent. Tricker never converts between them.",
  },
  {
    label: "What if we don't split everything equally?",
    content:
      "Set a different percentage for each person, or include only the housemates sharing that bill. For example, rent can be split 40/30/30 while groceries are shared equally. The shares must add up to 100%.",
  },
  {
    label: "Does Tricker move money for us?",
    content:
      "No. Tricker tracks shared bills and shows who should pay whom. You make those transfers yourself using your preferred bank or payment method.",
  },
  {
    label: "Can I belong to more than one household?",
    content:
      "Yes. One account can join multiple rooms. Each room has separate members, bills, and history, and you can switch between them without mixing their records.",
  },
  {
    label: "Can we change a bill after the month is closed?",
    content:
      "Not while it's closed. Closing a month locks its bills against additions, edits, and deletions. If something needs correcting, a room admin can reopen the month.",
  },
];
</script>

<template>
  <section id="faq" class="scroll-mt-20 border-t border-default bg-muted/30">
    <UContainer class="py-14 sm:py-20 lg:py-24">
      <div class="grid gap-8 lg:grid-cols-12 lg:gap-16">
        <div class="lg:col-span-4">
          <p class="font-mono text-xs tracking-wider text-toned uppercase">Good questions</p>
          <h2 class="mt-3 text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">
            Before you move in.
          </h2>
          <p class="mt-4 text-sm leading-relaxed text-muted">
            A few things worth knowing before your household gets started.
          </p>
        </div>
        <div class="lg:col-span-8">
          <UAccordion
            :items="faqs"
            :ui="{
              trigger: 'py-5 text-highlighted',
              body: 'text-sm leading-relaxed text-muted pb-5',
            }"
          />
        </div>
      </div>
    </UContainer>
  </section>
</template>
