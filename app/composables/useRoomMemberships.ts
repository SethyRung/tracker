export function useRoomMemberships() {
  const { data, status, refresh } = useFetch("/api/rooms", {
    key: "room-memberships",
  });

  const rooms = computed(() => (isSuccessResponse(data.value) ? data.value.data : []));

  const route = useRoute();
  const currentRoomId = computed(() => (route.params.roomId as string | undefined) ?? null);
  const currentRoom = computed(() => rooms.value.find((r) => r.id === currentRoomId.value) ?? null);
  const currentRole = computed(() => currentRoom.value?.role ?? null);

  return { rooms, currentRoom, currentRoomId, currentRole, status, refresh };
}
