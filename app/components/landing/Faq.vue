<script setup lang="ts">
const faqs = [
  {
    label: "Can we use both dollars and riel?",
    content:
      "Yes. USD and KHR stay in separate ledgers, with their own totals and settlement plans. You pay back in the currency that was spent. Tricker never converts between them.",
  },
  {
    label: "What if we don't split equally?",
    content:
      "Set a percentage for each person on that bill, or leave someone off it. Shares must add up to 100%. Rent can be 40/30/30 while groceries are split evenly.",
  },
  {
    label: "Does Tricker move money for us?",
    content:
      "No. Tricker shows who should pay whom. You make those transfers yourself, in cash or through your own bank app.",
  },
  {
    label: "Can we change a bill after the month is closed?",
    content:
      "Not while it's closed. Closing locks that month against new bills, edits, and deletions. A room admin can reopen it if something needs correcting.",
  },
];
</script>

<template>
  <UContainer id="faq" class="scroll-mt-20 py-8">
    <UCard :ui="{ body: 'p-4 sm:p-6' }">
      <div class="mx-auto flex w-full max-w-(--ui-container) flex-col gap-8">
        <div>
          <h2
            class="text-left text-xl font-bold tracking-tight text-pretty text-highlighted sm:text-3xl"
          >
            Frequently asked questions
          </h2>
        </div>

        <UAccordion
          :items="faqs"
          class="mx-auto max-w-3xl"
          :ui="{
            root: 'space-y-2',
            item: 'rounded-lg border border-default last:border-b',
            trigger:
              'px-3.5 py-3 text-sm font-semibold text-highlighted hover:bg-muted sm:px-4 sm:text-base',
            body: 'border-t border-default bg-muted p-3.5 sm:p-4',
          }"
        />
      </div>
    </UCard>
  </UContainer>
</template>
