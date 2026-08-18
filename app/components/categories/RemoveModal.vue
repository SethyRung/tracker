<script setup lang="ts">
const props = defineProps<{
  roomId: string;
  category: { id: string; name: string } | null;
}>();

const emits = defineEmits<{
  removed: [];
}>();

const open = defineModel<boolean>("open");

const toast = useToast();
const busy = ref(false);

async function onConfirm() {
  const category = props.category;
  if (!category || busy.value) return;
  busy.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/categories/${category.id}`, {
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
      description: e instanceof Error ? e.message : "Could not remove category.",
    });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Remove ${category?.name ?? ''}?`"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-toned">
        Existing entries keep their label but new entries can't be assigned to this category.
      </p>
    </template>

    <template #footer="{ close }">
      <UButton label="Cancel" color="neutral" variant="ghost" :disabled="busy" @click="close" />
      <UButton
        label="Remove"
        color="error"
        :loading="busy"
        :disabled="!category"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
