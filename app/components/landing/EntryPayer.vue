<script setup lang="ts">
type AvatarColor = "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";

defineProps<{
  initials: string;
  color: AvatarColor;
  name: string;
}>();
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5 text-xs text-highlighted">
    <UAvatar :text="initials" :color="color" size="xs" class="shrink-0" />
    <span class="truncate">{{ name }}</span>
  </div>
</template>
