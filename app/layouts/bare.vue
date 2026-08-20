<script setup lang="ts">
const { signOut } = useUserSession();
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans">
    <UHeader
      title="Tricker"
      :toggle="false"
      :ui="{
        title: 'font-pixel-circle text-primary',
      }"
    >
      <template #right>
        <UColorModeButton />

        <UButton
          icon="i-lucide-log-out"
          label="Sign Out"
          color="neutral"
          variant="ghost"
          @click="signOut()"
          :ui="{ label: 'hidden lg:block' }"
        />
      </template>
    </UHeader>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
