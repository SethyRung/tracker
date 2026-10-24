<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";

useHead({ title: "Room Settings · Tricker" });

const { roomId } = useScopedRoom();
const { user } = useUserSession();
const { currentRoom, currentRole, status, refresh } = useRoomMemberships();
const lastRoomId = useLastRoomId();
const toast = useToast();
const { copy } = useClipboard();
const {
  data: membersData,
  status: membersStatus,
  refresh: refreshMembers,
} = useLazyFetch(() => `/api/rooms/${roomId.value}/members`);

const schema = z.object({
  name: z
    .string("Give your room a name")
    .trim()
    .min(1, "Give your room a name")
    .max(80, "Keep it under 80 characters"),
  currencies: z
    .array(z.enum(["USD", "KHR"], "Choose USD or KHR"), "Pick at least one currency")
    .min(1, "Pick at least one currency"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ name: "", currencies: [] });
const submitting = ref(false);

const currencyItems = [
  {
    label: "USD — American Dollar",
    description: "Rent, deposits, and household utilities.",
    value: "USD",
    symbol: "$",
  },
  {
    label: "KHR — Cambodian Riel",
    description: "Local markets, groceries, and everyday expenses.",
    value: "KHR",
    symbol: "៛",
  },
];

const settings = computed(() => {
  const room = currentRoom.value;
  const isAdmin = currentRole.value === "admin";
  const emailUnverified = user.value?.emailVerified !== true;
  const lastMember = isAdmin && room?.memberCount === 1;
  const members = isSuccessResponse(membersData.value)
    ? membersData.value.data.map((member) => ({
        ...member,
        name: member.nickname || member.userName || "Roommate",
        isYou: member.userId === user.value?.id,
        roleDisplay: member.role === "admin" ? "Administrator" : "Roommate",
        avatarSrc: member.avatarUrl || undefined,
      }))
    : [];

  const subtitle = room
    ? `${room.name} · ${room.memberCount} active roommate${room.memberCount === 1 ? "" : "s"}`
    : "Manage your household";

  return {
    isAdmin,
    emailUnverified,
    lastMember,
    canDelete: lastMember && !emailUnverified,
    members,
    administrators: members.filter((member) => member.role === "admin"),
    loading: status.value === "pending" && !room,
    dirty:
      !!room &&
      (state.name.trim() !== room.name ||
        state.currencies.includes("USD") !== room.usdEnabled ||
        state.currencies.includes("KHR") !== room.khrEnabled),
    currencies: [room?.usdEnabled ? "USD" : null, room?.khrEnabled ? "KHR" : null]
      .filter(Boolean)
      .join(" + "),
    subtitle,
    badge: {
      label: isAdmin ? "Admin access" : "View only",
      icon: isAdmin ? "i-lucide-shield-check" : "i-lucide-lock",
      color: isAdmin ? ("primary" as const) : ("neutral" as const),
    },
    occupantsTitle: `Active Occupants (${room?.memberCount ?? 0})`,
  };
});

function syncFromRoom(room: { name: string; usdEnabled: boolean; khrEnabled: boolean }) {
  state.name = room.name;
  state.currencies = [
    ...(room.usdEnabled ? ["USD" as const] : []),
    ...(room.khrEnabled ? ["KHR" as const] : []),
  ];
}

watch(
  currentRoom,
  (room) => {
    if (room) syncFromRoom(room);
  },
  { immediate: true, flush: "sync" },
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (submitting.value || !settings.value.isAdmin || !settings.value.dirty) return;
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
    await refresh();
    toast.add({ icon: "i-lucide-circle-check", title: "Room updated", color: "success" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Could not update room",
      color: "error",
      description: getErrorMessage(e, "Please try again."),
    });
  } finally {
    submitting.value = false;
  }
}

async function copyRoomId() {
  try {
    await copy(roomId.value);
    toast.add({ title: "Room ID copied", icon: "i-lucide-copy", color: "success" });
  } catch {
    toast.add({ title: "Could not copy room ID", color: "error" });
  }
}

async function onDeleted() {
  if (lastRoomId.value === roomId.value) lastRoomId.value = "";
  await refresh();
  await navigateTo("/");
}
</script>

<template>
  <UContainer class="max-w-6xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4 border-b border-default pb-6">
      <div class="space-y-2">
        <p class="text-xs font-medium tracking-wider text-muted uppercase">Household preferences</p>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
          Room Settings
        </h1>
        <p class="text-sm text-muted">
          {{ settings.subtitle }}
        </p>
      </div>
      <UBadge
        v-if="currentRoom"
        :label="settings.badge.label"
        :icon="settings.badge.icon"
        :color="settings.badge.color"
        variant="subtle"
        class="rounded-full"
      />
    </div>

    <div v-if="settings.loading" class="grid gap-6 lg:grid-cols-3">
      <USkeleton class="h-96 rounded-xl lg:col-span-2" />
      <USkeleton class="h-64 rounded-xl" />
    </div>
    <UEmpty
      v-else-if="!currentRoom"
      icon="i-lucide-house"
      title="Room settings unavailable"
      description="We could not load this room. Please try again."
      :actions="[
        { label: 'Try again', onClick: () => refresh() },
        { label: 'Your rooms', to: '/rooms', color: 'neutral', variant: 'outline' },
      ]"
    />
    <div v-else class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div class="contents lg:col-span-2 lg:block lg:space-y-6">
        <UAlert
          v-if="!settings.isAdmin"
          class="order-1"
          color="neutral"
          variant="subtle"
          icon="i-lucide-lock"
          title="Only admins can change room settings"
          description="You can view the room name and enabled currencies here."
        />
        <UCard class="order-1 rounded-xl" :ui="{ body: 'p-5 sm:p-6' }">
          <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
            <div class="flex items-start gap-3 border-b border-default pb-5">
              <UIcon name="i-lucide-sliders-horizontal" class="mt-0.5 size-5 shrink-0 text-muted" />
              <div class="space-y-1">
                <h2 class="font-semibold text-highlighted">General Information</h2>
                <p class="text-sm text-muted">
                  Room identity and currency ledgers shared by your household.
                </p>
              </div>
            </div>

            <UFormField
              label="Room name"
              name="name"
              required
              help="Visible to everyone in this household."
            >
              <UInput
                v-model="state.name"
                icon="i-lucide-house"
                class="w-full"
                size="lg"
                :maxlength="80"
                :disabled="!settings.isAdmin || submitting"
              />
            </UFormField>

            <UFormField
              label="Currency ledgers"
              name="currencies"
              required
              description="Choose the currencies your household uses."
            >
              <UCheckboxGroup
                v-model="state.currencies"
                :items="currencyItems"
                variant="card"
                indicator="end"
                :disabled="!settings.isAdmin || submitting"
                :ui="{
                  fieldset: 'grid gap-3 sm:grid-cols-2',
                  item: 'items-start p-4',
                  label: 'font-semibold',
                  description: 'mt-2 text-xs leading-relaxed',
                }"
              >
                <template #label="{ item }">
                  <span
                    class="mb-3 flex size-8 items-center justify-center rounded-md bg-elevated font-mono text-lg text-highlighted"
                    >{{ item.symbol }}</span
                  >
                  {{ item.label }}
                </template>
              </UCheckboxGroup>
            </UFormField>

            <p class="flex items-start gap-2 text-xs leading-relaxed text-muted">
              <UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0" />
              USD and KHR keep separate balances. Amounts are never converted between currencies.
            </p>
            <div v-if="settings.isAdmin" class="flex justify-end border-t border-default pt-5">
              <UButton
                type="submit"
                label="Save room changes"
                icon="i-lucide-check"
                size="lg"
                :loading="submitting"
                :disabled="!settings.dirty"
                class="w-full justify-center sm:w-auto"
              />
            </div>
          </UForm>
        </UCard>

        <UCard
          v-if="settings.isAdmin"
          class="order-3 rounded-xl ring-error/30"
          :ui="{ body: 'space-y-5 p-5 sm:p-6' }"
        >
          <div class="flex items-center gap-2 text-error">
            <UIcon name="i-lucide-triangle-alert" class="size-5" />
            <h2 class="font-semibold">Danger Zone</h2>
          </div>
          <p class="text-sm leading-relaxed text-muted">
            Retire this household so it no longer appears in anyone's dashboard or room switcher.
            History is kept for 30 days in case the room needs to be restored.
          </p>
          <UAlert
            v-if="settings.emailUnverified"
            color="warning"
            variant="subtle"
            icon="i-lucide-mail"
            title="Verify your email to delete this room"
            description="Room deletion stays locked until your email is confirmed."
          />
          <UAlert
            v-if="!settings.lastMember"
            color="warning"
            variant="subtle"
            icon="i-lucide-lock"
            title="Remove other members first"
            description="A room can only be deleted when you are its sole member."
          >
            <template #actions>
              <UButton
                label="Manage room members"
                trailing-icon="i-lucide-arrow-right"
                color="warning"
                variant="link"
                size="sm"
                :to="`/rooms/${roomId}/members`"
              />
            </template>
          </UAlert>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <RoomsDeleteModal :room-id="roomId" :room-name="currentRoom.name" @deleted="onDeleted">
              <UButton
                icon="i-lucide-trash-2"
                label="Delete room"
                color="error"
                variant="subtle"
                :disabled="!settings.canDelete"
              />
            </RoomsDeleteModal>
            <p class="text-xs text-muted">Requires verified email and 1 resident</p>
          </div>
        </UCard>
      </div>

      <aside class="order-2 space-y-6 lg:order-0">
        <UCard class="rounded-xl" :ui="{ body: 'space-y-5 p-5' }">
          <h2
            class="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase"
          >
            <UIcon name="i-lucide-info" class="size-4" /> Room Details
          </h2>
          <dl class="space-y-4 text-sm">
            <div class="space-y-1.5">
              <dt class="text-muted">Room ID</dt>
              <dd class="flex min-w-0 items-center gap-2">
                <code
                  class="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs"
                  :title="roomId"
                  >{{ roomId }}</code
                >
                <UButton
                  icon="i-lucide-copy"
                  aria-label="Copy room ID"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="copyRoomId"
                />
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted">Active currencies</dt>
              <dd class="font-mono text-xs">{{ settings.currencies }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted">Your role</dt>
              <dd>{{ settings.isAdmin ? "Admin" : "Member" }}</dd>
            </div>
            <div
              v-if="settings.administrators.length"
              class="space-y-2 border-t border-default pt-4"
            >
              <dt class="text-muted">Room administrators</dt>
              <dd
                v-for="member in settings.administrators"
                :key="member.id"
                class="flex items-center gap-2"
              >
                <UAvatar :src="member.avatarSrc" :alt="member.name" size="2xs" />
                <span class="min-w-0 truncate">{{ member.name }}</span>
                <UBadge v-if="member.isYou" label="You" variant="subtle" size="sm" />
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard class="rounded-xl" :ui="{ body: 'space-y-4 p-5' }">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-xs font-semibold tracking-wider text-muted uppercase">
              {{ settings.occupantsTitle }}
            </h2>
            <UButton
              label="Manage"
              :to="`/rooms/${roomId}/members`"
              color="neutral"
              variant="link"
              size="xs"
            />
          </div>
          <USkeleton v-if="membersStatus === 'pending' && !settings.members.length" class="h-24" />
          <UButton
            v-else-if="!isSuccessResponse(membersData)"
            label="Retry loading members"
            color="neutral"
            variant="outline"
            @click="refreshMembers()"
          />
          <ul v-else class="divide-y divide-default">
            <li
              v-for="member in settings.members"
              :key="member.id"
              class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <UAvatar :src="member.avatarSrc" :alt="member.name" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ member.name }}
                  <span v-if="member.isYou" class="text-xs text-muted">(You)</span>
                </p>
                <p class="mt-0.5 text-xs text-muted">
                  {{ member.roleDisplay }}
                </p>
              </div>
              <span class="size-1.5 shrink-0 rounded-full bg-success" aria-label="Active" />
            </li>
          </ul>
        </UCard>
        <p class="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
          <UIcon name="i-lucide-shield-check" class="size-4 shrink-0" />
          Every split uses integer amounts to keep shared balances accurate, down to the last cent
          or riel.
        </p>
      </aside>
    </div>
  </UContainer>
</template>
