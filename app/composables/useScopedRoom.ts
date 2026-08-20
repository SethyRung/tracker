export function useScopedRoom() {
  const route = useRoute();
  const roomId = computed(() => route.params.roomId as string);

  const lastRoomId = useLastRoomId();
  lastRoomId.value = roomId.value;

  return { roomId };
}