<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";
import { MEMBER_COLORS } from "#shared/types/member-color";

export interface RoomMembershipProfile {
  id: string;
  roomId: string;
  roomName: string;
  nickname: string | null;
  avatarUrl: string | null;
  color: string | null;
  role?: string;
}

const props = defineProps<{ membership: RoomMembershipProfile }>();
const emit = defineEmits<{ saved: [] }>();
const toast = useToast();
const saving = ref(false);

const schema = z.object({
  nickname: z
    .string("Enter a nickname or leave it blank")
    .trim()
    .max(80, "Keep it under 80 characters"),
  color: z.string("Pick a color").regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ nickname: "", color: MEMBER_COLORS[0] });

watch(
  [() => props.membership.id, () => props.membership.nickname, () => props.membership.color],
  ([, nickname, color]) => {
    state.nickname = nickname ?? "";
    state.color = color ?? MEMBER_COLORS[0];
  },
  { immediate: true },
);

const dirty = computed(
  () =>
    state.nickname.trim() !== (props.membership.nickname ?? "") ||
    state.color !== (props.membership.color ?? MEMBER_COLORS[0]),
);

const roleBadge = computed(() => {
  if (!props.membership.role) return null;
  const isAdmin = props.membership.role === "admin";
  return {
    label: isAdmin ? "Admin" : "Member",
    color: isAdmin ? ("primary" as const) : ("neutral" as const),
  };
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (saving.value || !dirty.value) return;
  saving.value = true;
  try {
    const res = await $fetch<ApiResponse<unknown>>(
      `/api/rooms/${props.membership.roomId}/membership`,
      {
        method: "PATCH",
        body: { nickname: event.data.nickname || null, color: event.data.color },
      },
    );
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Room profile updated", color: "success" });
    emit("saved");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Could not update room profile",
      color: "error",
      description: getErrorMessage(e, "Please try again."),
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-5 rounded-lg border border-default bg-muted/40 p-4 sm:p-5"
    @submit="onSubmit"
  >
    <div class="flex items-center justify-between gap-3">
      <NuxtLink
        :to="`/rooms/${membership.roomId}/dashboard`"
        class="flex min-w-0 items-center gap-2 font-semibold text-highlighted hover:underline"
      >
        <UIcon name="i-lucide-house" class="size-5 shrink-0 text-muted" />
        <span class="truncate">{{ membership.roomName }}</span>
      </NuxtLink>
      <UBadge
        v-if="roleBadge"
        :label="roleBadge.label"
        :color="roleBadge.color"
        variant="subtle"
        size="sm"
      />
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <UFormField
        label="Room nickname"
        name="nickname"
        help="Leave blank to use your account name."
      >
        <UInput
          v-model="state.nickname"
          class="w-full"
          placeholder="Your account name"
          :maxlength="80"
        />
      </UFormField>

      <UFormField label="Avatar accent color" name="color">
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            v-for="color in MEMBER_COLORS"
            :key="color"
            type="button"
            class="flex size-7 items-center justify-center rounded-full border border-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="{
              'ring-2 ring-default ring-offset-2 ring-offset-default': state.color === color,
            }"
            :style="{ backgroundColor: color }"
            :aria-label="`Use accent color ${color}`"
            :aria-pressed="state.color === color"
            @click="state.color = color"
          >
            <UIcon
              v-if="state.color === color"
              name="i-lucide-check"
              class="size-4 text-inverted"
            />
          </button>
          <UPopover>
            <UButton
              icon="i-lucide-palette"
              aria-label="Choose custom accent color"
              color="neutral"
              variant="outline"
              size="xs"
              class="rounded-full"
            />
            <template #content>
              <UColorPicker v-model="state.color" format="hex" class="p-3" />
            </template>
          </UPopover>
        </div>
      </UFormField>
    </div>

    <div class="flex justify-end">
      <UButton
        type="submit"
        label="Save room profile"
        icon="i-lucide-check"
        color="neutral"
        variant="outline"
        :loading="saving"
        :disabled="!dirty"
        class="w-full justify-center sm:w-auto"
      />
    </div>
  </UForm>
</template>
