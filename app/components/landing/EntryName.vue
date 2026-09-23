<script setup lang="ts">
defineProps<{
  name: string;
  currency: string;
  emphasis?: boolean;
}>();
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5">
    <span
      class="truncate text-highlighted"
      :class="emphasis ? 'text-xs font-semibold sm:text-sm' : 'font-medium'"
    >
      {{ name }}
    </span>
    <UBadge
      :label="currency"
      variant="outline"
      size="xs"
      class="shrink-0 rounded-full font-mono text-2xs"
    />
  </div>
</template>
