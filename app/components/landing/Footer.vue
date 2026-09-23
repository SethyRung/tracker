<script setup lang="ts">
import type { FooterColumn } from "@nuxt/ui";

const year = new Date().getFullYear();

const columns: FooterColumn[] = [
  {
    label: "Product",
    children: [
      { label: "Features", to: "#features" },
      { label: "How it works", to: "#how-it-works" },
      { label: "Dual Currency", to: "#currencies" },
      { label: "Settlement Graph", to: "#features" },
    ],
  },
  {
    label: "Resources",
    children: [
      {
        label: "GitHub",
        to: "https://github.com/SethyRung/tracker",
        target: "_blank",
      },
      {
        label: "Nuxt 4",
        to: "https://nuxt.com",
        target: "_blank",
      },
      {
        label: "Nuxt UI v4",
        to: "https://ui.nuxt.com",
        target: "_blank",
      },
      {
        label: "NuxtHub",
        to: "https://hub.nuxt.com",
        target: "_blank",
      },
    ],
  },
  {
    label: "Get Started",
    children: [
      { label: "Sign in", to: "/sign-in" },
      { label: "Create account", to: "/sign-up" },
      { label: "Dashboard", to: "/rooms" },
    ],
  },
];
</script>

<template>
  <UFooter
    :ui="{
      root: 'border-t border-default bg-muted/20',
      top: 'border-b border-default/60 py-12 lg:py-16',
      container: 'py-6',
    }"
  >
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns">
          <template #left>
            <div class="max-w-sm space-y-4 pr-4">
              <NuxtLink to="/" class="select-none">
                <span class="text-xl font-bold tracking-tight text-highlighted">
                  Tricker<span class="text-primary">.</span>
                </span>
              </NuxtLink>

              <p class="text-sm leading-relaxed text-muted">
                Shared bills, settled simply. Multi-tenant household ledger for USD and KHR with
                zero messy conversion.
              </p>

              <div class="flex items-center gap-2 pt-1">
                <UBadge
                  label="v0.1.0"
                  variant="subtle"
                  color="neutral"
                  size="sm"
                  class="rounded-full"
                />
                <UBadge label="Open Source" variant="subtle" size="sm" class="rounded-full" />
              </div>
            </div>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #left>
      <p class="text-xs text-muted sm:text-sm">
        © {{ year }} Tricker. Shared bills, settled simply.
      </p>
    </template>

    <template #right>
      <UButton
        icon="i-simple-icons-github"
        color="neutral"
        variant="ghost"
        size="sm"
        to="https://github.com/SethyRung/tracker"
        target="_blank"
        aria-label="GitHub Repository"
      />
    </template>
  </UFooter>
</template>
