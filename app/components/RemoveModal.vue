<script lang="ts">
interface RemoveModalProps {
  title?: string;
  description?: string;
  onDelete: (close: () => void) => Promise<void>;
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<RemoveModalProps>(), {
  title: "Delete this data?",
  description: "This data will be permanently removed from the room.",
});
const open = defineModel<boolean>("open", { default: false });

const { isMD } = useBreakpoints();

const busy = ref(false);
async function onConfirm(close: () => void) {
  busy.value = true;
  try {
    await props.onDelete(close);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Panel
    v-model:open="open"
    :title="props.title"
    :modal="{ ui: { footer: 'justify-end' } }"
  >
    <slot />

    <template #body>
      <p class="text-toned">{{ props.description }}</p>
    </template>

    <template #footer="{ close }">
      <UButton
        v-if="isMD"
        label="Cancel"
        color="neutral"
        variant="ghost"
        :disabled="busy"
        @click="close"
      />

      <UButton
        label="Delete"
        color="error"
        :block="!isMD"
        :loading="busy"
        @click="onConfirm(close)"
      />
    </template>
  </Panel>
</template>
