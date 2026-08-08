<script setup lang="ts"></script>

<template>
  <div class="min-h-dvh font-sans bg-default text-default">
    <div class="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <aside
        class="relative hidden lg:flex flex-col gap-20 overflow-hidden bg-linear-to-br from-primary-50 via-default to-primary-100/40 dark:from-primary-950/30 dark:via-default dark:to-default px-12 py-14"
      >
        <div class="relative z-10 flex items-center gap-3 text-primary">
          <span class="font-pixel-grid text-4xl font-semibold">TRICKER</span>
        </div>

        <div class="relative z-10 max-w-md">
          <h1
            class="text-4xl xl:text-5xl font-semibold leading-tight tracking-tight text-highlighted"
          >
            Shared bills,
            <br />
            settled simply.
          </h1>
          <p class="mt-5 text-lg text-muted leading-relaxed">
            One household ledger. Two currencies. Zero awkward "who owes who" conversations.
          </p>
        </div>

        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--ui-color-primary-200)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_left,var(--ui-color-primary-800)_0%,transparent_60%)] opacity-40"
        />
      </aside>

      <main class="px-8 md:px-12 py-14">
        <div class="w-full max-w-md mx-auto">
          <UTheme
            :props="{
              input: {
                ui: {
                  root: 'w-full',
                },
              },
            }"
          >
            <slot />
          </UTheme>
        </div>
      </main>
    </div>
  </div>
</template>
