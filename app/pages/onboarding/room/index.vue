<script setup lang="ts">
definePageMeta({
  auth: { only: "user" },
});

useHead({ title: "Onboarding · Tricker" });

const { user } = useUserSession();
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <div class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Onboarding</p>
      <h1 class="font-pixel-circle text-2xl text-primary">
        Welcome{{ user?.name ? `, ${user.name}` : "" }}
      </h1>
      <p class="text-xs text-toned">Create a household or join one your admin invited you to.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UPageCard
        icon="i-lucide-house"
        title="Create a room"
        description="Start a new household. You'll be the admin and can invite members by link."
      >
        <template #footer>
          <UButton color="primary" to="/onboarding/room/new" label="Create room" />
        </template>
      </UPageCard>

      <UPageCard
        icon="i-lucide-link"
        title="Join with a link"
        description="Open the invite link your admin sent you. If you opened it from email, you're already here."
      >
        <template #footer>
          <UButton color="neutral" variant="outline" to="/dashboard" label="Go to dashboard" />
        </template>
      </UPageCard>
    </div>
  </UContainer>
</template>
