<script setup lang="ts">
definePageMeta({
  auth: { only: "user" },
});

const route = useRoute();
const token = computed(() => (route.params.token as string | undefined) ?? "");

const displayName = ref("");
const color = ref<string | null>(null);
const submitting = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

const { fetchSession } = useUserSession();

async function onAccept() {
  if (submitting.value || displayName.value.trim().length === 0) return;
  submitting.value = true;
  error.value = null;
  try {
    const res = await $fetch<{ roomId: string }>("/api/rooms/join", {
      method: "POST",
      body: {
        token: token.value,
        displayName: displayName.value.trim(),
        color: color.value ?? undefined,
      },
    });
    success.value = true;
    await fetchSession({ force: true });
    await navigateTo(`/dashboard?roomId=${res.roomId}`);
  } catch (e) {
    error.value = (e as { statusMessage?: string })?.statusMessage ?? "Could not join this room.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-lg">
    <header class="mb-6">
      <h1 class="font-pixel-circle text-2xl text-primary">Join a room</h1>
      <p class="text-toned mt-1">Pick a display name to use inside this household.</p>
    </header>

    <UForm :schema="null" class="space-y-5" @submit.prevent="onAccept">
      <UFormField label="Display name" name="displayName" required>
        <UInput
          v-model="displayName"
          placeholder="Your name in this room"
          size="lg"
          autocomplete="name"
        />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <UButton
        type="submit"
        label="Join room"
        size="lg"
        block
        :loading="submitting"
        :disabled="submitting || success"
      />

      <p class="text-xs text-toned">
        Token: <span class="font-mono">{{ token }}</span>
      </p>
    </UForm>
  </UContainer>
</template>
