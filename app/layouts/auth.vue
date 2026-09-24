<script setup lang="ts"></script>

<template>
  <div class="flex min-h-dvh flex-col justify-between bg-default font-sans text-default">
    <header class="flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
      <NuxtLink to="/" class="group flex items-center gap-1.5 select-none">
        <span class="text-xl font-bold tracking-tight text-highlighted">
          Tricker<span class="text-primary">.</span>
        </span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <UButton
          to="/"
          label="Home"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-arrow-left"
          class="hidden sm:inline-flex"
        />
        <UColorModeButton />
      </div>
    </header>

    <main class="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
      <div
        class="w-full max-w-107.5 rounded-lg border border-default bg-default p-7 shadow-2xl sm:p-9"
      >
        <slot />
      </div>
    </main>

    <footer
      class="flex h-14 shrink-0 items-center justify-between px-6 text-xs text-muted sm:px-10"
    >
      <p>© {{ new Date().getFullYear() }} Tricker</p>
      <p class="hidden sm:inline">Shared bills, settled simply.</p>
    </footer>
  </div>
</template>
