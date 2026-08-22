<script setup lang="ts">
const props = defineProps<{
  roomId: string;
  template: { id: string; categoryName: string } | null;
}>();

const emits = defineEmits<{
  removed: [];
}>();

const open = defineModel<boolean>("open");

const toast = useToast();
const busy = ref(false);

const { isMD } = useBreakpoints();
const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");
const OverlayComponent = computed(() => ({
  is: isMD.value ? UModal : UDrawer,
  props: isMD.value ? { ui: { footer: "justify-end" } } : { handleOnly: true, fixed: true },
}));

async function onConfirm() {
  const template = props.template;
  if (!template || busy.value) return;
  busy.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/templates/${template.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide:circle-check", title: "Deleted" });
    open.value = false;
    emits("removed");
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not delete template.",
    });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    :title="`Delete recurring template for ${template?.categoryName ?? ''}?`"
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <p class="text-toned">Entries already posted are kept but won't be re-created next month.</p>
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
        :disabled="!template"
        @click="onConfirm"
      />
    </template>
  </component>
</template>
