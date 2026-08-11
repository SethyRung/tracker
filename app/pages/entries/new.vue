<script setup lang="ts">
useHead({ title: "New Entry · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const router = useRouter();
const toast = useToast();

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

const { members, categories } = await useRoomLists(roomId);

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

    await navigateTo(`/entries/${res.data.entry.id}/edit`);
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create entry.",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="font-pixel-circle text-2xl text-primary mb-6">New Entry</h1>

      <UButton
        icon="i-lucide-chevron-left"
        label="Back"
        color="neutral"
        variant="outline"
        @click="router.back"
      />
    </div>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before logging entries."
    />

    <EntryForm v-else :members="members" :categories="categories" @submit="onSubmit">
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
  </UContainer>
</template>
