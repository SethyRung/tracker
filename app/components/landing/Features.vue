<script setup lang="ts">
const shares = [
  { name: "Seth", percent: "40%" },
  { name: "Ly", percent: "30%" },
  { name: "Dara", percent: "30%" },
];
</script>

<template>
  <section id="features" class="scroll-mt-20 border-y border-default bg-muted/30">
    <UContainer class="py-14 sm:py-20 lg:py-24">
      <div class="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-xl">
          <p class="font-mono text-xs tracking-wider text-toned uppercase">
            The little things, handled
          </p>
          <h2
            class="mt-3 text-3xl leading-tight font-bold tracking-tight text-highlighted sm:text-4xl"
          >
            Fair doesn't always mean equal.
          </h2>
        </div>
        <p class="max-w-sm text-sm leading-relaxed text-muted">
          Different rooms, different routines, different shares. Make the bills fit the way you
          actually live.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
        <article class="rounded-xl border border-default bg-default p-6 sm:p-8 lg:col-span-7">
          <div class="flex items-center gap-2 text-xs text-toned">
            <UIcon name="i-lucide-sliders-horizontal" class="size-4" />
            YOUR BILL, YOUR SPLIT
          </div>
          <h3 class="mt-3 text-xl font-semibold text-highlighted">
            A bigger room? A different share.
          </h3>
          <p class="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Split equally, set custom percentages, or leave someone out of a bill. Every share adds
            up to exactly 100%.
          </p>
          <div class="mt-7 rounded-lg border border-default bg-muted/40 p-4 sm:p-5">
            <div class="mb-5 flex items-center justify-between gap-2 text-xs">
              <span class="font-medium text-highlighted">Monthly rent</span>
              <span class="font-mono text-toned">Custom split</span>
            </div>
            <div class="flex h-3 gap-1 overflow-hidden rounded-sm" aria-hidden="true">
              <span class="w-2/5 bg-primary" />
              <span class="w-[30%] bg-inverted/60" />
              <span class="w-[30%] bg-inverted/30" />
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2">
              <div v-for="share in shares" :key="share.name">
                <p class="text-xs text-muted">{{ share.name }}</p>
                <p class="mt-1 font-mono text-lg font-medium text-highlighted">
                  {{ share.percent }}
                </p>
              </div>
            </div>
            <div
              class="mt-4 flex items-center gap-1.5 border-t border-default pt-3 text-xs text-toned"
            >
              <UIcon name="i-lucide-circle-check" class="size-4" />
              100% accounted for. Nobody left guessing.
            </div>
          </div>
        </article>

        <article
          class="flex flex-col rounded-xl border border-default bg-default p-6 sm:p-8 lg:col-span-5"
        >
          <div class="flex items-center gap-2 text-xs text-toned">
            <UIcon name="i-lucide-repeat-2" class="size-4" />
            LESS MONTHLY ADMIN
          </div>
          <h3 class="mt-3 text-xl font-semibold text-highlighted">Same rent. One less reminder.</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            Set up recurring bills once. They'll appear at the start of each month, ready for your
            household.
          </p>
          <div class="mt-7 flex-1 rounded-lg border border-default bg-muted/40 p-5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-highlighted">Rent template</span>
              <UBadge label="Active" color="neutral" variant="subtle" size="sm" />
            </div>
            <div class="mt-6 flex items-center justify-between gap-2 text-center">
              <div class="rounded-md border border-default bg-default px-4 py-3">
                <p class="font-mono text-xs text-muted">AUG</p>
                <p class="mt-1 font-mono text-2xl font-semibold text-highlighted">01</p>
              </div>
              <UIcon name="i-lucide-arrow-right" class="size-5 shrink-0 text-muted" />
              <div class="rounded-md border border-default bg-default px-4 py-3">
                <p class="font-mono text-xs text-muted">SEP</p>
                <p class="mt-1 font-mono text-2xl font-semibold text-highlighted">01</p>
              </div>
            </div>
            <p class="mt-5 text-center text-xs text-muted">A fresh month. Already on the ledger.</p>
          </div>
        </article>

        <article
          class="grid gap-6 rounded-xl border border-default bg-default p-6 sm:p-8 lg:col-span-5"
        >
          <div>
            <div class="flex items-center gap-2 text-xs text-toned">
              <UIcon name="i-lucide-door-open" class="size-4" />
              ROOM TO KEEP THINGS SEPARATE
            </div>
            <h3 class="mt-3 text-xl font-semibold text-highlighted">
              One account. More than one home.
            </h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">
              Join multiple rooms. Each keeps its own people, bills, and history. No crossed wires.
            </p>
          </div>
          <div class="space-y-2">
            <div
              v-for="(room, index) in ['Riverside home', 'Family apartment']"
              :key="room"
              class="flex items-center gap-3 rounded-md border border-default bg-muted/40 p-3"
            >
              <UIcon name="i-lucide-house" class="size-4 shrink-0 text-toned" />
              <span class="flex-1 text-sm text-highlighted">{{ room }}</span>
              <UIcon v-if="index === 0" name="i-lucide-check" class="size-4 text-toned" />
            </div>
          </div>
        </article>

        <article
          class="flex flex-col justify-between gap-6 rounded-xl border border-default bg-default p-6 sm:p-8 lg:col-span-7"
        >
          <div>
            <div class="flex items-center gap-2 text-xs text-toned">
              <UIcon name="i-lucide-lock-keyhole" class="size-4" />
              A CLEAR FINISH LINE
            </div>
            <h3 class="mt-3 text-xl font-semibold text-highlighted">
              Close the month. Keep the record.
            </h3>
            <p class="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              Review what everyone owes, make the transfers, and let your admin close the month.
              Bills stay locked against edits until an admin reopens it.
            </p>
          </div>
          <div
            class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-default bg-muted/40 p-5"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-default bg-default"
              >
                <UIcon name="i-lucide-calendar-check" class="size-5 text-toned" />
              </div>
              <div>
                <p class="text-sm font-medium text-highlighted">July's record</p>
                <p class="mt-1 text-xs text-muted">Saved for the next “wait, did I pay?”</p>
              </div>
            </div>
            <UBadge label="Closed" icon="i-lucide-lock" color="neutral" variant="outline" />
          </div>
        </article>
      </div>
    </UContainer>
  </section>
</template>
