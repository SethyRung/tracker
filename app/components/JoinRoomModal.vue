<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open");

const { refresh } = useRoomMemberships();

const schema = z.object({
  inviteInput: z.string().min(1, "Paste your invite code or link"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({ inviteInput: "" });

const submitting = ref(false);
const submitError = ref("");

watch(open, (isOpen) => {
  if (isOpen) {
    state.inviteInput = "";
    submitError.value = "";
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (submitting.value) return;
  const token = extractInviteToken(state.inviteInput ?? "");
  if (!token) {
    submitError.value = "Paste your invite code or link.";
    return;
  }
  submitting.value = true;
  submitError.value = "";
  try {
    const res = await $fetch("/api/rooms/join", {
      method: "POST",
      body: { token },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    const roomId = res.data.roomId;
    const lastRoomId = useLastRoomId();
    lastRoomId.value = roomId;
    await refresh();
    open.value = false;
    await navigateTo(`/rooms/${roomId}/dashboard`);
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : "Could not join this room.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Join a room"
    description="Paste the invite code or link your admin sent you."
  >
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <UFormField label="Invite code or link" name="inviteInput" required>
          <UInput
            v-model="state.inviteInput"
            placeholder="e.g. abcd1234 or https://tricker.app/join/abcd1234"
            size="lg"
            :ui="{ root: 'w-full' }"
            autofocus
          />
        </UFormField>

        <UAlert
          v-if="submitError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-x"
          :title="submitError"
        />

        <UButton
          type="submit"
          label="Join room"
          size="lg"
          block
          :loading="submitting"
          :disabled="submitting"
        />
      </UForm>
    </template>
  </UModal>
</template>
