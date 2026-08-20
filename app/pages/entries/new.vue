<script setup lang="ts">
useHead({ title: "New Entry · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const toast = useToast();

const { user } = useUserSession();
const roomId = computed(() => user.value?.roomId ?? null);

const { members, categories } = useRoomLists(roomId);

const { data: thisMonthEntriesRes } = await useFetch(() => `/api/rooms/${roomId.value}/entries`, {
  query: { month: monthKey() },
});

const thisMonthEntries = computed(() =>
  isSuccessResponse(thisMonthEntriesRes.value)
    ? thisMonthEntriesRes.value.data.filter((e) => e.status === "published" && e.categoryId)
    : [],
);

const blockedCategoryIds = computed(() =>
  Array.from(new Set(thisMonthEntries.value.map((e) => e.categoryId).filter(Boolean))),
);

const submitting = ref(false);

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

  submitting.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/entries`, {
      method: "POST",
      body: {
        categoryId: data.categoryId || null,
        currency: data.currency,
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

    await navigateTo(`/entries/${res.data.id}/edit`);
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create entry.",
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
      description="Create or join a room before logging entries."
    />

    <template v-else>
      <div class="space-y-1">
        <p class="font-mono text-xs uppercase tracking-wider text-toned">Entries</p>
        <h1 class="font-pixel-circle text-2xl text-primary">New entry</h1>
      </div>

      <EntryForm
        :members="members"
        :categories="categories"
        :blocked-category-ids="blockedCategoryIds"
        @submit="onSubmit"
      >
        <template #actions="{ totalWeight }">
          <UButton
            type="submit"
            label="Save Entry"
            block
            :loading="submitting"
            :disabled="totalWeight !== 10000 || submitting"
          />
        </template>
      </EntryForm>
    </template>
  </UContainer>
</template>
