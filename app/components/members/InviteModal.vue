<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{ roomId: string }>();
const open = defineModel<boolean>("open", { default: false });

const toast = useToast();

const loading = ref(false);
const submitting = ref(false);

const joinUrl = ref("");
const expiresAt = ref("");

const itemSchema = z.object({
  email: z.email("Invalid email").max(254).or(z.literal("")),
});

type ItemSchema = z.output<typeof itemSchema>;

const state = reactive<{ emails: Partial<ItemSchema>[] }>({
  emails: [{}],
});

const hasEmails = computed(() => state.emails.some((e) => !!e.email?.trim()));

function addEmail() {
  state.emails.push({});
}

function removeEmail(index: number) {
  if (state.emails.length > 1) state.emails.splice(index, 1);
  else state.emails[index] = {};
}

function reset() {
  state.emails = [{}];
  submitting.value = false;
}

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
    reset();
  }
});

function formatEmails(emails: string[], max = 4): string {
  if (emails.length <= max) return emails.join(", ");
  const shown = emails.slice(0, max).join(", ");
  return `${shown} and ${emails.length - max} more`;
}

async function onSubmit(_event: FormSubmitEvent<Record<string, unknown>>) {
  if (submitting.value) return;
  const emails = state.emails.map((e) => e.email?.trim()).filter((e): e is string => !!e);
  if (emails.length === 0) return;

  submitting.value = true;
  try {
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
      open.value = false;
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

const { isMD } = useBreakpoints();

const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");

const OverlayComponent = computed(() => {
  return {
    is: isMD.value ? UModal : UDrawer,
    props: isMD.value ? { ui: { footer: "justify-end" } } : { handleOnly: true, fixed: true },
  };
});
</script>

<template>
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    title="Invite members"
    description="Email housemates or share an invite link."
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <UForm id="invite-form" :state="state" class="space-y-4" @submit="onSubmit">
        <div class="space-y-2">
          <UForm
            v-for="(item, index) in state.emails"
            :key="index"
            :name="`emails.${index}`"
            :schema="itemSchema"
            nested
          >
            <UFormField name="email" label="Email" orientation="horizontal" class="w-full">
              <div class="flex gap-1 items-center w-full">
                <UInput
                  v-model="item.email"
                  type="email"
                  placeholder="someone@example.com"
                  size="lg"
                  class="flex-1"
                />
                <UButton
                  v-if="state.emails.length > 1"
                  icon="i-lucide-trash"
                  color="error"
                  variant="soft"
                  aria-label="Remove email"
                  @click="removeEmail(index)"
                />
              </div>
            </UFormField>
          </UForm>
        </div>

        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-plus"
          label="Add email"
          @click="addEmail"
        />
      </UForm>

      <USeparator label="OR" />

      <UFormField label="Invite link" :help="expiresAt ? `Expires at ${expiresAt}` : undefined">
        <UFieldGroup class="w-full">
          <UInput
            :model-value="joinUrl"
            :placeholder="loading ? 'Generating…' : ''"
            readonly
            size="lg"
            class="flex-1"
          />
          <UTooltip text="Copy to clipboard">
            <UButton
              icon="i-lucide-clipboard"
              color="neutral"
              variant="subtle"
              :loading="loading"
              :disabled="loading || !joinUrl"
              aria-label="Copy link"
              @click="copyLink"
            />
          </UTooltip>
        </UFieldGroup>
      </UFormField>
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
        form="invite-form"
        icon="i-lucide-send"
        label="Send invites"
        size="lg"
        :block="!isMD"
        :loading="submitting"
        :disabled="!hasEmails"
      />
    </template>
  </component>
</template>
