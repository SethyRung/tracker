<script setup lang="ts">
import type { ApiResponse } from "#shared/types/response";

const props = defineProps<{
  roomId: string;
  roomName: string;
}>();

const emits = defineEmits<{
  deleted: [];
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
  if (busy.value) return;
  busy.value = true;
  try {
    const res = await $fetch<ApiResponse<{ deletedAt: string }>>(`/api/rooms/${props.roomId}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Room deleted" });
    open.value = false;
    emits("deleted");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not delete room.",
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
    :title="`Delete ${roomName}?`"
    v-bind="OverlayComponent.props"
  >
    <template #body>
      <p class="text-toned">
        This room will disappear from everyone's lists. History is kept for 30 days in case it needs
        to be restored.
      </p>
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
        label="Delete room"
        color="error"
        :block="!isMD"
        :loading="busy"
        @click="onConfirm"
      />
    </template>
  </component>
</template>
