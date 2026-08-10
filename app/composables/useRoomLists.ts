export async function useRoomLists(roomId: Ref<string | null>) {
  const { data: membersRes, refresh: refreshMembers } = useFetch(
    `/api/rooms/${roomId.value}/members`,
  );
  const { data: categoriesRes, refresh: refreshCategories } = useFetch(
    `/api/rooms/${roomId.value}/categories`,
  );

  watch(roomId, async () => {
    await Promise.all([refreshMembers(), refreshCategories()]);
  });

  const members = computed(() => membersRes.value?.data?.members ?? []);
  const categories = computed(() => categoriesRes.value?.data?.categories ?? []);

  return { members, categories };
}
