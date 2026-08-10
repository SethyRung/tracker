<script setup lang="ts">
definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "Categories · Tricker" });

const { loggedIn, fetchSession } = useUserSession();
if (!loggedIn.value) await fetchSession({ force: true });

const { data: roomRes } = await useFetch("/api/rooms/current");
const roomId = computed(() => roomRes.value?.data?.room?.id ?? null);

const fetchWithCookies = useRequestFetch();

const categories = ref<Array<{ id: string; name: string; sortOrder: number }>>([]);

async function refreshCategories() {
  if (!roomId.value) return;
  const r = await fetchWithCookies(`/api/rooms/${roomId.value}/categories`);
  categories.value = r.data?.categories ?? [];
}

if (roomId.value) await refreshCategories();
watch(roomId, () => refreshCategories());

const newName = ref("");
const showAddForm = ref(false);
const addError = ref<string | null>(null);
const submitting = ref(false);

async function addCategory() {
  if (!roomId.value || submitting.value) return;
  const trimmed = newName.value.trim();
  if (!trimmed) {
    addError.value = "Name is required.";
    return;
  }
  submitting.value = true;
  addError.value = null;
  try {
    const maxSort = categories.value.reduce((max, c) => Math.max(max, c.sortOrder), -1);
    await fetchWithCookies(`/api/rooms/${roomId.value}/categories`, {
      method: "POST",
      body: { name: trimmed, sortOrder: maxSort + 1 },
    });
    newName.value = "";
    showAddForm.value = false;
    await refreshCategories();
  } catch (e) {
    addError.value = (e as { statusMessage?: string })?.statusMessage ?? "Could not add category.";
  } finally {
    submitting.value = false;
  }
}

async function deleteCategory(id: string) {
  if (!roomId.value) return;
  if (!confirm("Delete this category? This cannot be undone.")) return;
  await fetchWithCookies(`/api/rooms/${roomId.value}/categories/${id}`, {
    method: "DELETE",
  });
  await refreshCategories();
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="font-pixel-circle text-2xl text-primary">Categories</h1>
        <p class="text-xs text-toned mt-1">{{ categories.length }} total</p>
      </div>
      <UButton
        size="sm"
        color="primary"
        icon="i-lucide-plus"
        :disabled="showAddForm || !roomId"
        @click="showAddForm = true"
      >
        Add
      </UButton>
    </div>

    <UCard v-if="showAddForm" class="mb-4">
      <UForm :schema="null" class="space-y-3" @submit="addCategory">
        <UInput v-model="newName" placeholder="e.g. Pets" size="md" autofocus />
        <UAlert v-if="addError" color="error" variant="subtle" :title="addError" />
        <div class="flex gap-2">
          <UButton type="submit" color="primary" size="sm" :loading="submitting"> Add </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="
              showAddForm = false;
              newName = '';
              addError = null;
            "
          >
            Cancel
          </UButton>
        </div>
      </UForm>
    </UCard>

    <div v-if="!roomId" class="text-sm text-toned text-center py-8">No room yet.</div>

    <div v-else>
      <div v-if="categories.length === 0" class="text-sm text-toned text-center py-8">
        No categories yet. Click "Add" to create one.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-default bg-elevated"
        >
          <span class="font-medium">{{ cat.name }}</span>
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-trash"
            @click="deleteCategory(cat.id)"
          />
        </div>
      </div>
    </div>
  </UContainer>
</template>
