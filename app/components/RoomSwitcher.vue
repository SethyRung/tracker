<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { rooms, currentRoom, currentRoomId } = useRoomMemberships();

const lastRoomId = useLastRoomId();

const otherRooms = computed(() => rooms.value.filter((r) => r.id !== currentRoomId.value));

const items = computed<DropdownMenuItem[]>(() => {
  const list: DropdownMenuItem[] = [];
  if (otherRooms.value.length > 0) {
    list.push({ label: "Switch room", type: "label" });
    for (const r of otherRooms.value) {
      list.push({
        label: r.name,
        icon: r.role === "admin" ? "i-lucide-shield" : "i-lucide-users",
        to: `/rooms/${r.id}/dashboard`,
        onSelect: () => {
          lastRoomId.value = r.id;
        },
      });
    }
    list.push({ type: "separator" });
  }
  if (currentRoom.value?.role === "admin" && currentRoomId.value) {
    list.push({
      label: "Room settings",
      icon: "i-lucide-settings",
      to: `/rooms/${currentRoomId.value}/settings`,
    });
    list.push({ type: "separator" });
  }
  list.push({ label: "Create new room", icon: "i-lucide-plus", to: "/onboarding/room" });
  list.push({ label: "Join with invite code", icon: "i-lucide-ticket", to: "/rooms" });
  return list;
});
</script>

<template>
  <UDropdownMenu v-if="currentRoomId" :items="items" :content="{ align: 'end', sideOffset: 8 }">
    <UButton
      :label="currentRoom?.name ?? 'Room'"
      icon="i-lucide-house"
      trailing-icon="i-lucide-chevron-down"
      color="neutral"
      variant="ghost"
    />
  </UDropdownMenu>
</template>
