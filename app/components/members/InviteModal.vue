<script setup lang="ts">
import * as z from "zod";

const props = defineProps<{
  roomId: string;
}>();

const toast = useToast();
const open = defineModel<boolean>("open");

const loading = ref(false);

const joinUrl = ref<string>("");
const expiresAt = ref<string>("");

async function createInviteLink() {
  try {
    loading.value = true;

    const res = await $fetch(`/api/rooms/${props.roomId}/invite-links/create`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    joinUrl.value = res.data.joinUrl;
    expiresAt.value = toDayJS(res.data.expiresAt).format("YYYY-MM-DD HH:mm");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create invite link.",
    });
  } finally {
    loading.value = false;
  }
}

async function copyLink() {
  const url = joinUrl.value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ icon: "i-lucide-circle-check", title: "Copied" });
  } catch {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Could not copy",
      description: "Long-press the URL to copy it manually.",
    });
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    createInviteLink();
  } else {
    state.emails = [{}];
    submitting.value = false;
  }
});

const itemSchema = z.object({
  email: z.email("Invalid email").max(254),
});

type ItemSchema = z.output<typeof itemSchema>;

const state = reactive<{ emails: Partial<ItemSchema>[] }>({
  emails: [{}],
});

function addEmail() {
  state.emails.push({});
}

function removeEmail() {
  if (state.emails.length > 1) {
    state.emails.pop();
  }
}

function formatEmails(emails: string[], max = 4): string {
  if (emails.length <= max) return emails.join(", ");
  const shown = emails.slice(0, max).join(", ");
  return `${shown} and ${emails.length - max} more`;
}

const formRef = useTemplateRef("form");

const submitting = ref(false);

const hasEmails = computed(() => state.emails.some((e) => !!e.email?.trim()));

async function onSubmit() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const emails = state.emails.map((e) => e.email?.trim()).filter((e): e is string => !!e);
    if (emails.length === 0) return;

    const res = await $fetch(`/api/rooms/${props.roomId}/invite-links/send`, {
      method: "POST",
      body: { emails },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    const results = res.data;
    const successfulEmails = results.filter((r) => r.emailSent).map((r) => r.email);
    const failedEmails = results.filter((r) => !r.emailSent).map((r) => r.email);

    if (successfulEmails.length === 0) {
      toast.add({
        color: "error",
        icon: "i-lucide-circle-x",
        title: "No invites sent",
        description:
          failedEmails.length > 0 ? `Failed: ${formatEmails(failedEmails)}` : "Please try again.",
      });
    } else if (failedEmails.length > 0) {
      toast.add({
        color: "warning",
        icon: "i-lucide-triangle-alert",
        title: "Some invites failed",
        description: `Sent to ${formatEmails(successfulEmails)}. Failed: ${formatEmails(failedEmails)}`,
      });
    } else {
      toast.add({
        color: "success",
        icon: "i-lucide-circle-check",
        title: "Invites sent",
        description: formatEmails(successfulEmails),
      });
    }
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not send invites.",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Invite members"
    :ui="{
      body: 'space-y-4',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <UForm ref="form" :state="state" class="space-y-4" @submit="onSubmit">
        <UForm
          v-for="(item, count) in state.emails"
          :key="count"
          :name="`emails.${count}`"
          :schema="itemSchema"
          nested
          class="space-y-2"
        >
          <UFormField
            label="Email"
            name="email"
            orientation="horizontal"
            class="w-full justify-start"
          >
            <div class="flex gap-1 items-center">
              <UInput v-model="item.email" placeholder="someone@example.com" class="flex-1" />

              <UButton
                v-if="count > 0"
                icon="i-lucide:trash"
                color="error"
                variant="soft"
                @click="removeEmail"
              />
            </div>
          </UFormField>
        </UForm>

        <UButton color="neutral" variant="subtle" @click="addEmail"> Add email </UButton>
      </UForm>

      <USeparator label="OR" />

      <UFormField label="Invite link" :help="`Expired at ${expiresAt}`" class="w-full">
        <UFieldGroup class="w-full">
          <UInput :model-value="joinUrl" readonly class="flex-1" />
          <UTooltip text="Copy to clipboard">
            <UButton
              icon="i-lucide-clipboard"
              color="neutral"
              variant="subtle"
              aria-label="Copy link"
              @click="copyLink"
            />
          </UTooltip>
        </UFieldGroup>
      </UFormField>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Cancel"
        color="neutral"
        variant="subtle"
        :disabled="submitting"
        @click="close"
      />
      <UButton
        icon="i-lucide-send"
        label="Send invites"
        :loading="submitting"
        :disabled="!hasEmails"
        @click="formRef?.submit()"
      />
    </template>
  </UModal>
</template>
