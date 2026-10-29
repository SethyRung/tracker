<script setup lang="ts">
import type { ApiResponse } from "#shared/types/response";

type Member = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  positions: Array<{ currency: string; formatted: string }>;
};
const props = defineProps<{ roomId: string; source: Member | null; members: Member[] }>();
const emit = defineEmits<{ refresh: [] }>();
const open = defineModel<boolean>("open", { default: false });
const targetId = ref("");
const saving = ref(false);
const toast = useToast();
const targets = computed(() => props.members.filter((member) => member.userId));
const options = computed(() =>
  targets.value.map((member) => ({ label: member.name, description: member.email, value: member.id })),
);
const target = computed(() => targets.value.find((member) => member.id === targetId.value));
watch(open, () => {
  targetId.value = "";
});

async function merge() {
  if (!props.source || !target.value || saving.value) return;
  saving.value = true;
  try {
    const result = await $fetch<ApiResponse<unknown>>(`/api/rooms/${props.roomId}/members/merge`, {
      method: "POST",
      body: { sourceId: props.source.id, targetId: target.value.id },
    });
    if (!isSuccessResponse(result)) throw new Error(result.status.message);
    open.value = false;
    emit("refresh");
    toast.add({ title: "Roommates merged", color: "success", icon: "i-lucide-circle-check" });
  } catch (error) {
    toast.add({
      title: "Could not merge roommates",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
      duration: 0,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Panel
    v-model:open="open"
    title="Merge roommates"
    description="Combine this placeholder with a joined roommate. This cannot be undone."
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Joined roommate"
          ><USelect
            v-model="targetId"
            :items="options"
            placeholder="Choose a roommate"
            class="w-full"
        /></UFormField>
        <div v-if="source && target" class="space-y-3 rounded-lg border border-default p-4">
          <p class="text-sm text-muted">Review current month balances before merging:</p>
          <div
            v-for="member in [source, target]"
            :key="member.id"
            class="flex justify-between gap-4 text-sm"
          >
            <span class="font-semibold">{{ member.name }}</span>
            <span class="text-right font-mono">{{
              member.positions
                .map((position) => `${position.currency} ${position.formatted}`)
                .join(" · ")
            }}</span>
          </div>
          <p class="text-xs text-muted">All bill history will belong to {{ target.name }}.</p>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="close" /><UButton
          label="Confirm merge"
          color="primary"
          :disabled="!target"
          :loading="saving"
          @click="merge"
        />
      </div>
    </template>
  </Panel>
</template>
