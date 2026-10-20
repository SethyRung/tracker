<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open", { default: false });

const schema = z.object({
  inviteInput: z.string().min(1, "Paste your invite code or link"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({ inviteInput: "" });
const submitError = ref("");

const { isMD } = useBreakpoints();
const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");
const OverlayComponent = computed(() => ({
  is: isMD.value ? UModal : UDrawer,
  props: isMD.value ? {} : { handleOnly: true, fixed: true },
}));

watch(open, (isOpen) => {
  if (isOpen) {
    state.inviteInput = "";
    submitError.value = "";
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const token = extractInviteToken(event.data.inviteInput);
  if (!token) {
    submitError.value = "Paste your invite code or link.";
    return;
  }
  open.value = false;
  await navigateTo(`/join/${encodeURIComponent(token)}`);
}
</script>

<template>
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    title="Join a household"
    description="Paste the invite code or link. You'll confirm the room before joining."
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <UForm
        id="join-room-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Invite code or link" name="inviteInput" required>
          <UInput
            v-model="state.inviteInput"
            icon="i-lucide-ticket"
            placeholder="Code or link"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="off"
            autofocus
            :ui="{ root: 'w-full', base: 'font-mono' }"
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
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton label="Cancel" color="neutral" variant="ghost" :block="!isMD" @click="close" />
        <UButton
          type="submit"
          form="join-room-form"
          label="Continue"
          trailing-icon="i-lucide-arrow-right"
          size="lg"
          :block="!isMD"
        />
      </div>
    </template>
  </component>
</template>
