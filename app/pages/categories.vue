<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  auth: { only: "user" },
});
useHead({ title: "Categories · Tricker" });

const { loggedIn, fetchSession } = useUserSession();
if (!loggedIn.value) await fetchSession({ force: true });

const { data: roomRes, refresh: refreshRoom } = await useFetch<{ room: { id: string } | null }>(
  "/api/rooms/current",
);
const roomId = computed(() => roomRes.value?.room?.id ?? null);

const { data: catsRes, refresh: refreshCategories } = await useFetch<{
  categories: Array<{ id: string; name: string; sortOrder: number }>;
}>("/api/rooms/[id]/categories", {
  watch: [roomId],
  immediate: true,
  default: () => ({ categories: [] }),
});

const categories = computed(() => catsRes.value?.categories ?? []);

const editingId = ref<string | null>(null);
const editName = ref("");
const editError = ref<string | null>(null);
const showAddForm = ref(false);
const addName = ref("");
const addError = ref<string | null>(null);
const submitting = ref(false);

async function saveRename(id: string) {
  if (submitting.value) return;
  if (!roomId.value) return;
  const trimmed = editName.value.trim();
  if (trimmed.length === 0) {
    editError.value = "Name is required.";
    return;
  }
  submitting.value = true;
  editError.value = null;
  try {
    await $fetch(`/api/rooms/${roomId.value}/categories/${id}`, {
      method: "PATCH",
      body: { name: trimmed },
    });
    editingId.value = null;
    editName.value = "";
    await refreshCategories();
  } catch (e) {
    editError.value =
      (e as { statusMessage?: string })?.statusMessage ?? "Could not rename category.";
  } finally {
    submitting.value = false;
  }
}

function startEdit(id: string, currentName: string) {
  editingId.value = id;
  editName.value = currentName;
  editError.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editName.value = "";
  editError.value = null;
}

async function addCategory(_event: FormSubmitEvent<{ name: string }>) {
  if (!roomId.value) return;
  if (submitting.value) return;
  const trimmed = addName.value.trim();
  if (trimmed.length === 0) {
    addError.value = "Name is required.";
    return;
  }
  submitting.value = true;
  addError.value = null;
  try {
    const maxSort = categories.value.reduce((max, c) => Math.max(max, c.sortOrder), -1);
    await $fetch(`/api/rooms/${roomId.value}/categories`, {
      method: "POST",
      body: { name: trimmed, sortOrder: maxSort + 1 },
    });
    addName.value = "";
    showAddForm.value = false;
    await refreshCategories();
  } catch (e) {
    addError.value =
      (e as { statusMessage?: string })?.statusMessage ?? "Could not add category.";
  } finally {
    submitting.value = false;
  }
}

async function deleteCategory(id: string) {
  if (!roomId.value) return;
  if (!confirm("Delete this category? This cannot be undone.")) return;
  await $fetch(`/api/rooms/${roomId.value}/categories/${id}`, {
    method: "DELETE",
  });
  await refreshCategories();
}

async function move(id: string, direction: -1 | 1) {
  if (!roomId.value) return;
  const idx = categories.value.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= categories.value.length) return;
  const a = categories.value[idx]!;
  const b = categories.value[targetIdx]!;
  await Promise.all([
    $fetch(`/api/rooms/${roomId.value}/categories/${a.id}`, {
      method: "PATCH",
      body: { sortOrder: b.sortOrder },
    }),
    $fetch(`/api/rooms/${roomId.value}/categories/${b.id}`, {
      method: "PATCH",
      body: { sortOrder: a.sortOrder },
    }),
  ]);
  await refreshCategories();
}

watch(roomId, () => refreshRoom());
</script>

<template>
  <UContainer class="py-6 max-w-2xl">
    <header class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="font-pixel-circle text-2xl text-primary">Categories</h1>
        <p class="text-sm text-toned">Labels for grouping your bills.</p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        :disabled="showAddForm"
        @click="showAddForm = true"
      >
        Add category
      </UButton>
    </header>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before managing categories."
    />

    <template v-else>
      <UAlert
        v-if="showAddForm"
        color="primary"
        variant="subtle"
        title="New category"
        class="mb-4"
      >
        <template #description>
          <UForm class="flex gap-3 mt-2" @submit="addCategory">
            <UInput v-model="addName" placeholder="e.g. Pets" size="md" class="flex-1" />
            <UButton type="submit" color="primary" :loading="submitting">Add</UButton>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              @click="showAddForm = false; addName = ''; addError = null;"
            >
              Cancel
            </UButton>
          </UForm>
          <UAlert
            v-if="addError"
            color="error"
            variant="subtle"
            :title="addError"
            class="mt-3"
          />
        </template>
      </UAlert>

      <UCard>
        <template v-if="categories.length === 0">
          <p class="text-sm text-toned text-center py-6">No categories yet.</p>
        </template>

        <ul v-else class="divide-y divide-default">
          <li
            v-for="(cat, idx) in categories"
            :key="cat.id"
            class="flex items-center gap-3 py-3"
          >
            <div class="flex-1 min-w-0">
              <template v-if="editingId === cat.id">
                <UInput
                  v-model="editName"
                  size="sm"
                  autofocus
                  @keydown.enter.prevent="saveRename(cat.id)"
                  @keydown.esc="cancelEdit"
                />
                <UAlert
                  v-if="editError"
                  color="error"
                  variant="subtle"
                  :title="editError"
                  class="mt-2"
                />
              </template>
              <template v-else>
                <p class="font-medium text-default truncate">{{ cat.name }}</p>
              </template>
            </div>

            <div v-if="editingId === cat.id" class="flex gap-2">
              <UButton
                size="xs"
                color="primary"
                :loading="submitting"
                @click="saveRename(cat.id)"
              >
                Save
              </UButton>
              <UButton size="xs" color="neutral" variant="ghost" @click="cancelEdit">
                Cancel
              </UButton>
            </div>
            <div v-else class="flex gap-1">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-chevron-up"
                :disabled="idx === 0"
                @click="move(cat.id, -1)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-chevron-down"
                :disabled="idx === categories.length - 1"
                @click="move(cat.id, 1)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-pencil"
                @click="startEdit(cat.id, cat.name)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash"
                @click="deleteCategory(cat.id)"
              />
            </div>
          </li>
        </ul>
      </UCard>
    </template>
  </UContainer>
</template>