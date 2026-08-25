<script setup lang="ts">
useHead({ title: "Join room · Tricker" });

const route = useRoute();
const toast = useToast();
const { fetchSession } = useUserSession();

const token = computed(() => (route.params.token as string | undefined) ?? "");
const submitting = ref(false);

async function onAccept() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const res = await $fetch("/api/rooms/join", {
      method: "POST",
      body: { token: token.value },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    await fetchSession({ force: true });
    await navigateTo(`/rooms/${res.data.roomId}/dashboard`);
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
      <p class="text-xs text-toned">
        You'll appear as your account name. Set a per-room nickname later from your account.
      </p>
    </div>

    <UCard variant="outline">
      <UButton
        label="Join room"
        size="lg"
        block
        :loading="submitting"
        :disabled="submitting"
        @click="onAccept"
      />
    </UCard>
  </UContainer>
</template>
