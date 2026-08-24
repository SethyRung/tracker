<script setup lang="ts">
useHead({ title: "Settings · Tricker" });

const { roomId } = useScopedRoom();
const { currentRoom, currentRole, status, refresh } = useRoomMemberships();
const lastRoomId = useLastRoomId();

const loading = computed(() => status.value === "pending" && !currentRoom.value);
const isAdmin = computed(() => currentRole.value === "admin");
const canDelete = computed(() => isAdmin.value && (currentRoom.value?.memberCount ?? 0) === 1);
const deleteOpen = ref(false);

async function onDeleted() {
  if (lastRoomId.value === roomId.value) lastRoomId.value = "";
  await refresh();
  await navigateTo("/");
}
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <div class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
      <h1 class="font-pixel-circle text-2xl text-primary">Settings</h1>
      <p class="text-xs text-toned">{{ currentRoom?.name }}</p>
    </div>

    <USkeleton v-if="loading" class="h-40 rounded-xl" />

    <UCard v-else-if="isAdmin" variant="outline" :ui="{ body: 'p-5 space-y-4' }">
      <div class="space-y-1">
        <h2 class="text-sm font-medium text-default">Delete this room</h2>
        <p class="text-sm text-toned">
          Retire the room so it no longer appears in anyone's switcher or dashboard.
        </p>
      </div>

      <UAlert
        v-if="!canDelete"
        color="warning"
        variant="subtle"
        icon="i-lucide-users"
        title="Remove the other members first"
        description="A room can only be deleted when you are the last person in it."
      >
        <template #actions>
          <UButton
            label="Go to members"
            color="warning"
            variant="soft"
            size="sm"
            :to="`/rooms/${roomId}/members`"
          />
        </template>
      </UAlert>

      <UButton
        label="Delete room"
        color="error"
        icon="i-lucide-trash"
        :disabled="!canDelete"
        @click="deleteOpen = true"
      />
    </UCard>

    <UAlert
      v-else
      color="neutral"
      variant="subtle"
      icon="i-lucide-shield"
      title="Admin only"
      description="Only a room admin can change these settings."
    />

    <RoomsDeleteModal
      v-model:open="deleteOpen"
      :room-id="roomId"
      :room-name="currentRoom?.name ?? 'this room'"
      @deleted="onDeleted"
    />
  </UContainer>
</template>
