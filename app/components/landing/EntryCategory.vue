<script setup lang="ts">
defineProps<{
  category: string;
}>();
</script>

<template>
  <UBadge :label="category" variant="subtle" color="neutral" size="xs" class="shrink-0 font-mono" />
</template>
