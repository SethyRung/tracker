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
const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");
const OverlayComponent = computed(() => ({
  is: isMD.value ? UModal : UDrawer,
  props: isMD.value ? { ui: { footer: "justify-end" } } : { handleOnly: true, fixed: true },
}));

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
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    :title="props.title"
    v-bind="OverlayComponent.props"
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
  </component>
</template>
