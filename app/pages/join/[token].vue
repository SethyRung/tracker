<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  auth: { only: "user" },
});

useHead({ title: "Join room · Tricker" });

const route = useRoute();
const toast = useToast();
const { fetchSession } = useUserSession();

const token = computed(() => (route.params.token as string | undefined) ?? "");

const schema = z.object({
  displayName: z.string().min(1, "Display name is required").max(80),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({ displayName: "" });
const submitting = ref(false);

async function onAccept(event: FormSubmitEvent<Schema>) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const res = await $fetch("/api/rooms/join", {
      method: "POST",
      body: {
        token: token.value,
        displayName: event.data.displayName.trim(),
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    await fetchSession({ force: true });
    await navigateTo("/dashboard");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: e instanceof Error ? e.message : "Could not join this room.",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UContainer class="max-w-lg py-6 space-y-6">
    <div class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Invite</p>
      <h1 class="font-pixel-circle text-2xl text-primary">Join a room</h1>
      <p class="text-xs text-toned">Pick a display name to use inside this household.</p>
    </div>

    <UCard variant="outline">
      <UForm :schema="schema" :state="state" class="space-y-6" @submit="onAccept">
        <UFormField label="Display name" name="displayName" required>
          <UInput
            v-model="state.displayName"
            placeholder="Your name in this room"
            size="lg"
            :ui="{ root: 'w-full' }"
            autocomplete="name"
          />
        </UFormField>

        <UButton
          type="submit"
          label="Join room"
          size="lg"
          block
          :loading="submitting"
          :disabled="submitting"
        />
      </UForm>
    </UCard>
  </UContainer>
</template>
