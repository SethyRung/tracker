<script setup lang="ts">
const route = useRoute();
const entryId = computed(() => route.params.id as string);
const NEW_ENTRY_ID = "new";
const isCreate = computed(() => entryId.value === NEW_ENTRY_ID);

useHead({ title: () => (isCreate.value ? "New Entry · Tricker" : "Edit Entry · Tricker") });

const { roomId } = useScopedRoom();
const { currentRole } = useRoomMemberships();
const isAdmin = computed(() => currentRole.value === "admin");

const toast = useToast();
const { user } = useUserSession();

const { members, categories } = useRoomLists(roomId);

const { data: thisMonthEntriesRes, execute: fetchThisMonth } = useFetch<ApiResponse<any[]>>(
  () => `/api/rooms/${roomId.value}/entries`,
  {
    query: { month: monthKey() },
    immediate: false,
    watch: false,
  },
);
const thisMonthEntries = computed(() =>
  isSuccessResponse(thisMonthEntriesRes.value)
    ? thisMonthEntriesRes.value.data.filter((e) => e.status === "published" && e.categoryId)
    : [],
);
const blockedCategoryIds = computed(() =>
  Array.from(new Set(thisMonthEntries.value.map((e) => e.categoryId).filter(Boolean))),
);

const {
  data: entryRes,
  refresh: refreshEntry,
  execute: fetchEntry,
} = useFetch<ApiResponse<any>>(() => `/api/rooms/${roomId.value}/entries/${entryId.value}`, {
  immediate: false,
  watch: false,
});
watch(
  entryId,
  () => {
    if (isCreate.value) void fetchThisMonth();
    else void fetchEntry();
  },
  { immediate: true },
);
const entry = computed(() => (isSuccessResponse(entryRes.value) ? entryRes.value.data : null));

const submitting = ref(false);
const showDeleteModal = ref(false);

const isDraft = computed(() => entry.value?.status === "draft");
const isOwner = computed(() => entry.value?.createdByUserId === user.value?.id);

// Unified rule (SPEC §8): published → creator or admin; draft → admin only. Create is always editable.
const canEdit = computed(() => {
  if (isCreate.value) return true;
  if (isAdmin.value) return true;
  if (!entry.value) return false;
  if (isDraft.value) return false;
  return isOwner.value;
});
const canPublish = computed(() => !isCreate.value && isAdmin.value && isDraft.value);

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
  if (!roomId.value) return;

  const amountMinor =
    data.currency === "USD" ? Math.round(data.amountMajor * 100) : Math.round(data.amountMajor);

  submitting.value = true;
  try {
    if (isCreate.value) {
      const res = await $fetch(`/api/rooms/${roomId.value}/entries`, {
        method: "POST",
        body: {
          categoryId: data.categoryId || null,
          currency: data.currency,
          amountMinor,
          date: data.date,
          paidByMembershipId: data.paidByMembershipId,
          notes: data.description || null,
          weights,
        },
      });
      if (!isSuccessResponse(res)) throw new Error(res.status.message);
      await navigateTo(`/rooms/${roomId.value}/entries/${res.data.id}`);
    } else {
      if (!entry.value) return;
      const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.value.id}`, {
        method: "PATCH",
        body: {
          categoryId: data.categoryId || null,
          amountMinor,
          date: data.date,
          paidByMembershipId: data.paidByMembershipId,
          notes: data.description || null,
          weights,
        },
      });
      if (!isSuccessResponse(res)) throw new Error(res.status.message);
      await refreshEntry();
      toast.add({ icon: "i-lucide-circle-check", title: "Saved" });
    }
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
  if (isCreate.value || !roomId.value || !entry.value) return;

  submitting.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.value.id}/publish`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
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
    <div class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Entries</p>
        <div class="flex items-center gap-2">
          <h1 class="font-pixel-circle text-2xl text-primary">
            {{ isCreate ? "New entry" : "Entry" }}
          </h1>
          <template v-if="!isCreate">
            <UBadge v-if="isDraft" color="warning" variant="subtle" size="sm" label="Draft" />
            <UBadge v-else color="success" variant="subtle" size="sm" label="Published" />
          </template>
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

    <p v-if="!isCreate && !canEdit" class="text-xs text-toned">
      {{
        isDraft
          ? "Only an admin can edit a draft entry."
          : "Only the creator or an admin can edit this entry."
      }}
    </p>
    <p v-else-if="!isCreate" class="text-xs text-toned">Editing updates this entry only.</p>

    <EntryForm
      :members="members"
      :categories="categories"
      :blocked-category-ids="blockedCategoryIds"
      :disabled="!canEdit"
      :initial="entry"
      @submit="onSubmit"
    >
      <template #actions="{ totalWeight }">
        <UButton
          v-if="isCreate"
          type="submit"
          label="Save Entry"
          block
          :loading="submitting"
          :disabled="totalWeight !== 10000 || submitting"
        />
        <div v-else class="flex flex-wrap gap-3 pt-2">
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
      v-if="!isCreate"
      v-model:open="showDeleteModal"
      :room-id="roomId"
      :entry="entry"
      @removed="navigateTo(`/rooms/${roomId}/dashboard`)"
    />
  </UContainer>
</template>
