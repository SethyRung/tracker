<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";

useHead({ title: "Settings · Tricker" });

const { roomId } = useScopedRoom();
const { currentRoom, currentRole, status, refresh } = useRoomMemberships();
const lastRoomId = useLastRoomId();
const toast = useToast();

const schema = z.object({
  name: z.string().trim().min(1, "Give your room a name").max(80, "Keep it under 80 characters"),
  currencies: z.array(z.string()).min(1, "Pick at least one currency"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  currencies: [],
});

const loading = computed(() => status.value === "pending" && !currentRoom.value);
const isAdmin = computed(() => currentRole.value === "admin");
const canDelete = computed(() => isAdmin.value && (currentRoom.value?.memberCount ?? 0) === 1);

const submitting = ref(false);

const currencyItems = [
  { label: "USD", description: "American Dollar", value: "USD" },
  { label: "KHR", description: "Cambodian Riel", value: "KHR" },
];

function syncFromRoom(room: { name: string; usdEnabled: boolean; khrEnabled: boolean }) {
  state.name = room.name;
  state.currencies = [...(room.usdEnabled ? ["USD"] : []), ...(room.khrEnabled ? ["KHR"] : [])];
}

const dirty = computed(() => {
  const room = currentRoom.value;
  if (!room) return false;
  return (
    state.name.trim() !== room.name ||
    state.currencies.includes("USD") !== room.usdEnabled ||
    state.currencies.includes("KHR") !== room.khrEnabled
  );
});

watch(
  () => currentRoom.value?.id,
  (id) => {
    if (!id || !currentRoom.value) return;
    syncFromRoom(currentRoom.value);
  },
  { immediate: true },
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const res = await $fetch<ApiResponse<{ name: string }>>(`/api/rooms/${roomId.value}`, {
      method: "PATCH",
      body: {
        name: event.data.name,
        usdEnabled: event.data.currencies.includes("USD"),
        khrEnabled: event.data.currencies.includes("KHR"),
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Room updated" });
    await refresh();
    if (currentRoom.value) syncFromRoom(currentRoom.value);
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not update this room.",
    });
  } finally {
    submitting.value = false;
  }
}

async function onDeleted() {
  if (lastRoomId.value === roomId.value) lastRoomId.value = "";
  await refresh();
  await navigateTo("/");
}
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <div class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
      <h1 class="font-pixel-circle text-2xl text-primary">Settings</h1>
      <p class="text-xs text-toned">
        {{ currentRoom?.name }}
        <span v-if="currentRoom">
          · {{ currentRoom.memberCount }} member{{ currentRoom.memberCount === 1 ? "" : "s" }}
        </span>
      </p>
    </div>

    <USkeleton v-if="loading" class="h-64 rounded-xl" />

    <div v-if="isAdmin" class="space-y-10">
      <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <div class="space-y-1">
          <h2 class="font-semibold">General</h2>
          <p class="text-sm text-toned">The name and currencies everyone in this room sees.</p>
        </div>

        <UFormField label="Room name" name="name" required>
          <UInput v-model="state.name" :ui="{ root: 'w-full' }" />
        </UFormField>

        <UFormField label="Currencies" name="currencies" required>
          <UCheckboxGroup v-model="state.currencies" :items="currencyItems" variant="card" />
        </UFormField>

        <UButton type="submit" label="Save changes" :loading="submitting" :disabled="!dirty" />
      </UForm>

      <div class="space-y-4">
        <div class="space-y-1">
          <h2 class="font-semibold text-error">Delete this room</h2>
          <p class="text-sm text-toned">
            Retire the room so it no longer appears in anyone's switcher or dashboard.
          </p>
        </div>

        <UAlert
          v-if="!canDelete"
          color="warning"
          variant="subtle"
          icon="i-lucide-users"
          title="Remove the other members first"
          description="A room can only be deleted when you are the last person in it."
        >
          <template #actions>
            <UButton
              label="Go to members"
              color="warning"
              variant="soft"
              size="sm"
              :to="`/rooms/${roomId}/members`"
            />
          </template>
        </UAlert>

        <RoomsDeleteModal
          :room-id="roomId"
          :room-name="currentRoom?.name ?? 'this room'"
          @deleted="onDeleted"
        >
          <UButton icon="i-lucide-trash" label="Delete room" color="error" :disabled="!canDelete" />
        </RoomsDeleteModal>
      </div>
    </div>

    <UAlert
      v-else
      color="warning"
      variant="subtle"
      icon="i-lucide-lock"
      title="You don't have permission to change this room"
      description="Only admins can change the name and currencies of a room."
    />
  </UContainer>
</template>
