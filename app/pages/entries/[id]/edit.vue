<script setup lang="ts">
useHead({ title: "Edit Entry · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const route = useRoute();
const toast = useToast();

const { user } = useUserSession();
const roomId = computed(() => user.value?.roomId ?? null);

const { members, categories } = useRoomLists(roomId);

const entryId = computed(() => route.params.id as string);

const { data: entryRes, refresh: refreshEntry } = await useFetch(
  () => `/api/rooms/${roomId.value}/entries/${entryId.value}`,
);

const entry = computed(() => (isSuccessResponse(entryRes.value) ? entryRes.value.data : null));
type Entry = NonNullable<typeof entry.value>;

const submitting = ref(false);
const showDeleteModal = ref(false);

const isDraft = computed(() => entry.value?.status === "draft");
const isOwner = computed(() => entry.value?.createdByUserId === user.value?.id);
const isAdmin = computed(() => user.value?.role === "admin");

// Unified rule (SPEC §8): published → creator or admin; draft → admin only.
const canEdit = computed(() => {
  if (isAdmin.value) return true;
  if (!entry.value) return false;
  if (isDraft.value) return false;
  return isOwner.value;
});
const canPublish = computed(() => isAdmin.value && isDraft.value);

async function onSubmit({
  data,
  weights,
}: {
  data: {
    description?: string;
    amountMajor: number;
    currency: "USD" | "KHR";
    date: string;
    categoryId: string;
    paidByMembershipId: string;
  };
  weights: Array<{ membershipId: string; weightBps: number }>;
}) {
  if (!roomId.value || !entry.value) return;

  submitting.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.value.id}`, {
      method: "PATCH",
      body: {
        categoryId: data.categoryId || null,
        amountMinor:
          data.currency === "USD"
            ? Math.round(data.amountMajor * 100)
            : Math.round(data.amountMajor),
        date: data.date,
        paidByMembershipId: data.paidByMembershipId,
        notes: data.description || null,
        weights,
      },
    });

    if (!isSuccessResponse(res)) {
      throw new Error(res.status.message);
    }

    await refreshEntry();
    toast.add({ icon: "i-lucide-circle-check", title: "Saved" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not save.",
    });
  } finally {
    submitting.value = false;
  }
}

async function onPublish() {
  if (!roomId.value || !entry.value) return;

  submitting.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.value.id}/publish`, {
      method: "POST",
    });

    if (!isSuccessResponse(res)) {
      throw new Error(res.status.message);
    }

    await refreshEntry();
    toast.add({ icon: "i-lucide-circle-check", title: "Published" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not publish.",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <UPageCard
      v-if="!roomId"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before editing entries."
    />

    <template v-else>
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="font-mono text-xs uppercase tracking-wider text-toned">Entries</p>
          <div class="flex items-center gap-2">
            <h1 class="font-pixel-circle text-2xl text-primary">Entry</h1>
            <UBadge v-if="isDraft" color="warning" variant="subtle" size="sm" label="Draft" />
            <UBadge v-else color="success" variant="subtle" size="sm" label="Published" />
          </div>
        </div>

        <UButton
          v-if="canPublish"
          label="Publish"
          variant="outline"
          :loading="submitting"
          :disabled="submitting"
          @click="onPublish"
        />
      </div>

      <p v-if="!canEdit" class="text-xs text-toned">
        {{
          isDraft
            ? "Only an admin can edit a draft entry."
            : "Only the creator or an admin can edit this entry."
        }}
      </p>
      <p v-else class="text-xs text-toned">Editing updates this entry only.</p>

      <EntryForm
        v-if="entry"
        :members="members"
        :categories="categories"
        :disabled="!canEdit"
        :initial="entry"
        @submit="onSubmit"
      >
        <template #actions="{ totalWeight }">
          <div class="flex flex-wrap gap-3 pt-2">
            <UButton
              type="submit"
              label="Save"
              :loading="submitting"
              :disabled="!canEdit || totalWeight !== 10000 || submitting"
            />

            <UButton
              v-if="canEdit"
              label="Delete"
              color="error"
              variant="ghost"
              :disabled="submitting"
              @click="showDeleteModal = true"
            />
          </div>
        </template>
      </EntryForm>

      <EntriesRemoveModal
        v-model:open="showDeleteModal"
        :room-id="roomId"
        :entry="entry"
        @removed="navigateTo('/dashboard')"
      />
    </template>
  </UContainer>
</template>
