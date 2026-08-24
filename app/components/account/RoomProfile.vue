<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";
import { MEMBER_COLORS } from "#shared/types/member-color";

export interface RoomMembershipProfile {
  id: string;
  roomId: string;
  roomName: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  color: string | null;
}

const props = defineProps<{
  memberships: RoomMembershipProfile[];
}>();

const emit = defineEmits<{
  saved: [];
}>();

const toast = useToast();
const selectedRoomId = ref(props.memberships[0]?.roomId ?? "");

watch(
  () => props.memberships.map((m) => m.roomId).join(","),
  () => {
    if (!props.memberships.some((m) => m.roomId === selectedRoomId.value)) {
      selectedRoomId.value = props.memberships[0]?.roomId ?? "";
    }
  },
);

const selected = computed(
  () => props.memberships.find((m) => m.roomId === selectedRoomId.value) ?? null,
);

const roomItems = computed(() =>
  props.memberships.map((m) => ({ label: m.roomName, value: m.roomId })),
);

const schema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(80, "Keep it under 80 characters"),
  nickname: z.string().max(80).optional(),
  avatarUrl: z
    .string()
    .optional()
    .refine((value) => !value || /^https?:\/\//.test(value), "Enter a valid URL"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  displayName: "",
  nickname: "",
  avatarUrl: "",
  color: MEMBER_COLORS[0],
});
const saving = ref(false);

function syncFromMembership(membership: RoomMembershipProfile) {
  state.displayName = membership.displayName;
  state.nickname = membership.nickname ?? "";
  state.avatarUrl = membership.avatarUrl ?? "";
  state.color = membership.color ?? MEMBER_COLORS[0];
}

watch(
  selected,
  (membership) => {
    if (membership) syncFromMembership(membership);
  },
  { immediate: true },
);

const dirty = computed(() => {
  const membership = selected.value;
  if (!membership) return false;
  return (
    state.displayName.trim() !== membership.displayName ||
    (state.nickname ?? "") !== (membership.nickname ?? "") ||
    (state.avatarUrl ?? "") !== (membership.avatarUrl ?? "") ||
    state.color !== (membership.color ?? MEMBER_COLORS[0])
  );
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const membership = selected.value;
  if (!membership || saving.value) return;
  saving.value = true;
  try {
    const res = await $fetch<ApiResponse<unknown>>(`/api/rooms/${membership.roomId}/membership`, {
      method: "PATCH",
      body: {
        displayName: event.data.displayName,
        nickname: event.data.nickname || null,
        avatarUrl: event.data.avatarUrl || null,
        color: event.data.color,
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Room profile updated" });
    emit("saved");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not update this room profile.",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UCard variant="outline" :ui="{ body: 'p-5' }">
    <div v-if="memberships.length === 0" class="space-y-1">
      <h2 class="text-sm font-medium text-default">Room profiles</h2>
      <p class="text-sm text-toned">Join a room to set how you appear to housemates.</p>
    </div>

    <UForm v-else :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <div class="space-y-1">
        <h2 class="text-sm font-medium text-default">Room profiles</h2>
        <p class="text-sm text-toned">
          How you appear in each household. Role and share stay admin-only.
        </p>
      </div>

      <UFormField v-if="memberships.length > 1" label="Room" name="room">
        <USelect v-model="selectedRoomId" :items="roomItems" class="w-full" />
      </UFormField>
      <p v-else class="text-sm font-medium text-default">{{ selected?.roomName }}</p>

      <UFormField label="Display name" name="displayName" required>
        <UInput v-model="state.displayName" :ui="{ root: 'w-full' }" />
      </UFormField>

      <UFormField label="Nickname" name="nickname">
        <UInput v-model="state.nickname" :ui="{ root: 'w-full' }" />
      </UFormField>

      <UFormField label="Avatar URL" name="avatarUrl">
        <UInput v-model="state.avatarUrl" placeholder="https://" :ui="{ root: 'w-full' }" />
      </UFormField>

      <UFormField label="Color" name="color">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="swatch in MEMBER_COLORS"
            :key="swatch"
            type="button"
            class="size-8 rounded-full ring-2 ring-offset-2 ring-offset-default"
            :class="state.color === swatch ? 'ring-default' : 'ring-transparent'"
            :style="{ backgroundColor: swatch }"
            :aria-label="`Color ${swatch}`"
            @click="state.color = swatch"
          />
        </div>
      </UFormField>

      <UButton type="submit" label="Save room profile" :loading="saving" :disabled="!dirty" />
    </UForm>
  </UCard>
</template>
