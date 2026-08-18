<script setup lang="ts">
const props = defineProps<{
  roomId: string;
  entry: { id: string } | null;
}>();

const emits = defineEmits<{
  removed: [];
}>();

const open = defineModel<boolean>("open");

const toast = useToast();
const busy = ref(false);

async function onConfirm() {
  const entry = props.entry;
  if (!entry || busy.value) return;
  busy.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/entries/${entry.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Deleted" });
    open.value = false;
    emits("removed");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not delete entry.",
    });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete this entry?" :ui="{ footer: 'justify-end' }">
    <template #body>
      <p class="text-toned">This entry will be permanently removed from the room.</p>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="ghost" :disabled="busy" @click="close" />
      <UButton label="Delete" color="error" :loading="busy" :disabled="!entry" @click="onConfirm" />
    </template>
  </UModal>
</template>
