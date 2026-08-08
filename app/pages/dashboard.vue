<script setup lang="ts">
const { user, signOut } = useUserSession();
</script>

<template>
  <UContainer class="py-6">
    <AuthEmailVerificationBanner />

    <UCard class="mt-4">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-pixel-circle text-2xl text-primary">Dashboard</h1>
            <p class="text-sm text-toned">Welcome back, {{ user?.name }}.</p>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-log-out" @click="() => signOut()">
            Sign out
          </UButton>
        </div>
      </template>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="No room yet"
        description="Create or join a household to start tracking shared bills. Room management ships in the next phase."
      />
    </UCard>
  </UContainer>
</template>
