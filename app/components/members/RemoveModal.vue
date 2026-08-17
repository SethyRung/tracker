<script setup lang="ts">
const props = defineProps<{
  roomId: string;
  member: { id: string; displayName: string } | null;
}>();

const emits = defineEmits<{
  removed: [];
}>();

const open = defineModel<boolean>("open");

const toast = useToast();
const busy = ref(false);

async function onConfirm() {
  const member = props.member;
  if (!member || busy.value) return;
  busy.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/members/${member.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Removed" });
    open.value = false;
    emits("removed");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not remove member.",
    });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Remove ${member?.displayName ?? ''}?`"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-toned">
        They'll lose access to this room and can rejoin with a new invite if needed.
      </p>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="ghost" :disabled="busy" @click="close" />
      <UButton label="Remove" color="error" :loading="busy" :disabled="!member" @click="onConfirm" />
    </template>
  </UModal>
</template>