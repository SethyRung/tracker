<script setup lang="ts">
definePageMeta({ layout: "bare" });

useHead({ title: "Your rooms · Tricker" });

const { rooms, status } = useRoomMemberships();
const lastRoomId = useLastRoomId();

const loading = computed(() => status.value === "pending" && rooms.value.length === 0);
const joinOpen = ref(false);

const lastRoom = computed(() => rooms.value.find((r) => r.id === lastRoomId.value) ?? null);
const showContinue = computed(() => Boolean(lastRoom.value) && rooms.value.length > 1);

const sortedRooms = computed(() => {
  const last = lastRoomId.value;
  if (!last) return rooms.value;
  return [...rooms.value].sort((a, b) => Number(b.id === last) - Number(a.id === last));
});

const roomCountLabel = computed(() => {
  const n = rooms.value.length;
  return `${n} household${n === 1 ? "" : "s"}`;
});

function openRoom(id: string) {
  lastRoomId.value = id;
}

function roomInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function roomMeta(r: (typeof rooms.value)[number]) {
  const parts = [
    `${r.memberCount} member${r.memberCount === 1 ? "" : "s"}`,
    r.role === "admin" ? "Admin" : "Member",
  ];
  if (r.usdEnabled) parts.push("USD");
  if (r.khrEnabled) parts.push("KHR");
  return parts.join(" · ");
}
</script>

<template>
  <UContainer class="max-w-lg py-6 space-y-6" :class="rooms.length > 0 ? 'pb-28' : ''">
    <header class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Rooms</p>
      <h1 class="font-pixel-circle text-2xl text-primary">Choose a room</h1>
      <p v-if="!loading && rooms.length > 0" class="text-xs text-toned">{{ roomCountLabel }}</p>
    </header>

    <UCard v-if="loading" variant="outline" :ui="{ body: 'p-0' }">
      <ul class="divide-y divide-default">
        <li v-for="i in 3" :key="i" class="flex items-center gap-3 px-4 py-3.5">
          <USkeleton class="size-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-3 w-40" />
          </div>
        </li>
      </ul>
    </UCard>

    <UEmpty
      v-else-if="rooms.length === 0"
      icon="i-lucide-house"
      variant="subtle"
      title="No rooms yet"
      description="Create a household or join one with an invite code."
      :actions="[
        { icon: 'i-lucide-plus', label: 'Create room', to: '/onboarding/room' },
        {
          icon: 'i-lucide-ticket',
          label: 'Join room',
          color: 'neutral',
          variant: 'outline',
          onClick: () => {
            joinOpen = true;
          },
        },
      ]"
    />

    <template v-else>
      <UButton
        v-if="lastRoom && showContinue"
        block
        size="lg"
        icon="i-lucide-house"
        trailing-icon="i-lucide-arrow-right"
        :label="`Continue in ${lastRoom.name}`"
        :to="`/rooms/${lastRoom.id}/dashboard`"
        @click="openRoom(lastRoom.id)"
      />

      <UCard variant="outline" :ui="{ body: 'p-0' }">
        <ul class="divide-y divide-default">
          <li v-for="r in sortedRooms" :key="r.id">
            <NuxtLink
              :to="`/rooms/${r.id}/dashboard`"
              class="flex items-center gap-3 px-4 py-3.5 min-h-16 hover:bg-elevated/60 active:bg-elevated"
              @click="openRoom(r.id)"
            >
              <UAvatar
                :text="roomInitial(r.name)"
                size="lg"
                :color="r.id === lastRoomId ? 'primary' : 'neutral'"
              />

              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-default truncate">{{ r.name }}</p>
                  <UBadge
                    v-if="r.id === lastRoomId"
                    color="primary"
                    variant="subtle"
                    label="Last used"
                    size="xs"
                  />
                </div>
                <p class="text-xs text-toned truncate">{{ roomMeta(r) }}</p>
              </div>

              <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed shrink-0" />
            </NuxtLink>
          </li>
        </ul>
      </UCard>
    </template>
  </UContainer>

  <nav
    v-if="!loading && rooms.length > 0"
    class="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-default pb-[max(0.75rem,env(safe-area-inset-bottom))]"
  >
    <UContainer class="max-w-lg pt-3 grid grid-cols-2 gap-2">
      <UButton block icon="i-lucide-plus" label="Create" to="/onboarding/room" />
      <UButton
        block
        icon="i-lucide-ticket"
        label="Join"
        color="neutral"
        variant="outline"
        @click="joinOpen = true"
      />
    </UContainer>
  </nav>

  <JoinRoomModal v-model:open="joinOpen" />
</template>
