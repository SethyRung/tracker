<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open", { default: false });

const { refresh } = useRoomMemberships();

const schema = z.object({
  inviteInput: z.string().min(1, "Paste your invite code or link"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({ inviteInput: "" });

const submitting = ref(false);
const submitError = ref("");

const { isMD } = useBreakpoints();
const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");
const OverlayComponent = computed(() => ({
  is: isMD.value ? UModal : UDrawer,
  props: isMD.value ? { ui: { footer: "justify-end" } } : { handleOnly: true, fixed: true },
}));

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
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    title="Join a room"
    description="Paste the invite code or link your admin sent you."
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <UForm
        id="join-room-form"
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
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
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton
        v-if="isMD"
        label="Cancel"
        color="neutral"
        variant="ghost"
        :disabled="submitting"
        @click="close"
      />

      <UButton
        type="submit"
        form="join-room-form"
        label="Join room"
        size="lg"
        :block="!isMD"
        :loading="submitting"
        :disabled="submitting"
      />
    </template>
  </component>
</template>
