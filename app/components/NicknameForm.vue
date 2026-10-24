<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{
  roomId: string;
  roomName: string;
  member?: { id: string; nickname: string | null } | null;
}>();

const emit = defineEmits<{ refresh: [] }>();
const open = defineModel<boolean>("open", { default: false });

const toast = useToast();
const saving = ref(false);

const schema = z.object({
  nickname: z.string("Enter a nickname or leave it blank").max(80, "Keep it under 80 characters"),
});

const state = reactive({ nickname: "" });
const description = computed(() => `Shown in ${props.roomName} instead of the account name.`);

watch([open, () => props.member], ([isOpen]) => {
  if (!isOpen) return;
  state.nickname = props.member?.nickname ?? "";
});

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  const member = props.member;
  if (!member || saving.value) return;
  saving.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/members/${member.id}`, {
      method: "PATCH",
      body: { nickname: event.data.nickname.trim() || null },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    open.value = false;
    toast.add({ icon: "i-lucide-circle-check", title: "Nickname updated", color: "success" });
    emit("refresh");
  } catch (error) {
    toast.add({
      title: "Could not update nickname",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Panel
    v-model:open="open"
    title="Edit nickname"
    :description="description"
    :modal="{ ui: { footer: 'bg-muted/50' } }"
  >
    <template #body>
      <UForm id="nickname-form" :schema="schema" :state="state" @submit="onSubmit">
        <UFormField label="Nickname" name="nickname">
          <UInput
            v-model="state.nickname"
            autofocus
            placeholder="Uses the account name if empty"
            :ui="{ root: 'w-full' }"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <div class="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <UButton
          label="Cancel & Discard"
          color="neutral"
          variant="ghost"
          class="order-2 justify-center md:order-1"
          @click="close"
        />
        <UButton
          type="submit"
          form="nickname-form"
          label="Save"
          trailing-icon="i-lucide-check"
          :loading="saving"
          class="order-1 justify-center md:order-2"
        />
      </div>
    </template>
  </Panel>
</template>
