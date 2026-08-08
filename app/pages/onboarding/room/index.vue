<script setup lang="ts">
definePageMeta({
  auth: { only: "user" },
});

useHead({ title: "Onboarding · Tricker" });

const { user } = useUserSession();
</script>

<template>
  <UContainer class="py-8">
    <header class="mb-6">
      <h1 class="font-pixel-circle text-2xl text-primary">
        Welcome{{ user?.name ? `, ${user.name}` : "" }}
      </h1>
      <p class="text-toned mt-1">Create a household or join one your admin invited you to.</p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Create a room</h2>
        </template>
        <p class="text-sm text-toned">
          Start a new household. You'll be the admin and can invite members by link.
        </p>
        <UButton color="primary" to="/onboarding/room/new" class="mt-4"> Create room </UButton>
      </UCard>

      <UCard variant="subtle">
        <template #header>
          <h2 class="text-lg font-semibold">Join with a link</h2>
        </template>
        <p class="text-sm text-toned">
          Open the invite link your admin sent you. If you opened it from email, you're already
          here.
        </p>
        <UButton color="neutral" variant="outline" to="/dashboard" class="mt-4">
          Go to dashboard
        </UButton>
      </UCard>
    </div>
  </UContainer>
</template>
