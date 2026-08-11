<script setup lang="ts">
useHead({ title: "Edit Entry · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const route = useRoute();
const toast = useToast();

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

const { members, categories } = await useRoomLists(roomId);

const entryId = computed(() => route.params.id as string);

interface EntryRow {
  id: string;
  amountMinor: number;
  currency: string;
  status: "draft" | "published";
  notes: string | null;
  categoryId: string | null;
  paidByMembershipId: string;
  weights: Array<{ membershipId: string; weightBps: number }>;
  createdByUserId: string;
}

const entry = ref<EntryRow | null>(null);
const submitting = ref(false);

const isDraft = computed(() => entry.value?.status === "draft");
const isOwner = computed(() => entry.value?.createdByUserId === user.value?.id);
const isAdmin = computed(() =>
  members.value.some((m) => m.userId === user.value?.id && m.role === "admin"),
);
// Unified rule (SPEC §8): published → creator or admin; draft → admin only.
const canEdit = computed(() => {
  if (isAdmin.value) return true;
  if (!entry.value) return false;
  if (isDraft.value) return false;
  return isOwner.value;
});
const canPublish = computed(() => isAdmin.value && isDraft.value);

const fetchWithCookies = useRequestFetch();

async function loadEntry() {
  if (!roomId.value || !entryId.value) return;
  const res = await fetchWithCookies(`/api/rooms/${roomId.value}/entries/${entryId.value}`);
  entry.value = (res.data?.entry as EntryRow | undefined) ?? null;
}

if (roomId.value && entryId.value) await loadEntry();
watch([roomId, entryId], () => loadEntry());

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

    entry.value = res.data.entry;
    toast.add({ icon: "i-lucide:circle-check", title: "Saved" });
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
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

    await loadEntry();
    toast.add({ icon: "i-lucide:circle-check", title: "Published" });
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not publish.",
    });
  } finally {
    submitting.value = false;
  }
}

async function onDelete() {
  if (!roomId.value || !entry.value) return;
  if (!confirm("Delete this entry?")) return;

  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries/${entry.value.id}`, {
      method: "DELETE",
    });

    if (!isSuccessResponse(res)) {
      throw new Error(res.status.message);
    }

    await navigateTo("/dashboard");
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not delete.",
    });
  }
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <UButton
        icon="i-lucide-chevron-left"
        label="Back"
        color="neutral"
        variant="outline"
        to="/dashboard"
      />
      <UButton
        v-if="canPublish"
        label="Publish"
        color="primary"
        variant="outline"
        :loading="submitting"
        :disabled="submitting"
        @click="onPublish"
      />
    </div>

    <div class="flex items-center gap-3 mb-1">
      <h1 class="font-pixel-circle text-2xl text-primary">Entry</h1>
      <UBadge v-if="isDraft" color="warning" variant="subtle" size="sm">Draft</UBadge>
      <UBadge v-else color="success" variant="subtle" size="sm">Published</UBadge>
    </div>
    <p v-if="!canEdit" class="text-xs text-toned mb-6">
      {{ isDraft ? "Only an admin can edit a draft entry." : "Only the creator or an admin can edit this entry." }}
    </p>
    <p v-else class="text-xs text-toned mb-6">Editing updates this entry only.</p>

    <UAlert v-if="!roomId" color="info" variant="subtle" icon="i-lucide-info" title="No room yet" />

    <EntryForm
      v-else-if="entry"
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
            @click="onDelete"
          />
        </div>
      </template>
    </EntryForm>
  </UContainer>
</template>