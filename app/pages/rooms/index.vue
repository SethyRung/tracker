<script setup lang="ts">
definePageMeta({ layout: "bare" });

useHead({ title: "Your rooms · Tricker" });

const { rooms, status } = useRoomMemberships();

const lastRoomId = useCookie<string>("lastRoomId", {
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
});

const loading = computed(() => status.value === "pending" && rooms.value.length === 0);
</script>

<template>
  <UContainer class="max-w-3xl py-6 space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Rooms</p>
        <h1 class="font-pixel-circle text-2xl text-primary">Choose a room</h1>
      </div>
      <UButton icon="i-lucide-plus" label="Create new room" to="/onboarding/room" />
    </header>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
      <USkeleton v-for="i in 2" :key="i" class="h-28 rounded-xl" />
    </div>

    <div v-else-if="rooms.length === 0" class="text-center py-12 space-y-3">
      <UIcon name="i-lucide-house" class="size-10 text-dimmed mx-auto" />
      <p class="text-sm text-muted">You're not in any room yet.</p>
      <UButton
        icon="i-lucide-plus"
        label="Create your first room"
        to="/onboarding/room"
        color="primary"
        variant="soft"
      />
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <NuxtLink v-for="r in rooms" :key="r.id" :to="`/rooms/${r.id}/dashboard`" class="block">
        <UCard
          variant="outline"
          :ui="{ body: 'p-5 space-y-3' }"
          :class="r.id === lastRoomId ? 'ring-2 ring-primary' : ''"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-lucide-house" class="size-5 text-primary shrink-0" />
              <span class="font-medium text-default truncate">{{ r.name }}</span>
            </div>
            <UBadge
              v-if="r.id === lastRoomId"
              color="primary"
              variant="subtle"
              label="Last used"
              size="xs"
            />
          </div>
          <div class="flex items-center justify-between text-xs text-toned">
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-users" class="size-3.5" />
              {{ r.memberCount }} member{{ r.memberCount === 1 ? "" : "s" }}
            </span>
            <UBadge
              :color="r.role === 'admin' ? 'primary' : 'neutral'"
              :variant="r.role === 'admin' ? 'soft' : 'subtle'"
              :label="r.role === 'admin' ? 'Admin' : 'Member'"
              size="xs"
            />
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </UContainer>
</template>
