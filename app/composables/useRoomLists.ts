export function useRoomLists(roomId: Ref<string | null | undefined>) {
  const { data: membersRes } = useFetch(() => `/api/rooms/${roomId.value}/members`);
  const { data: categoriesRes } = useFetch(() => `/api/rooms/${roomId.value}/categories`);

  const members = computed(() =>
    isSuccessResponse(membersRes.value) ? membersRes.value.data : [],
  );
  const categories = computed(() =>
    isSuccessResponse(categoriesRes.value) ? (categoriesRes.value.data.categories ?? []) : [],
  );

  return { members, categories };
}
