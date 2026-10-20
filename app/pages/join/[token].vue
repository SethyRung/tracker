<script setup lang="ts">
type InvitePreview = {
  room: { id: string; name: string; usdEnabled: boolean; khrEnabled: boolean };
  inviterName: string | null;
  members: { name: string }[];
  role: "admin" | "member";
  alreadyMember: boolean;
};

const route = useRoute();
const toast = useToast();
const { user, fetchSession } = useUserSession();
const { refresh } = useRoomMemberships();
const lastRoomId = useLastRoomId();

const token = computed(() => (route.params.token as string | undefined) ?? "");
const submitting = ref(false);

const { data, status } = await useFetch(() => `/api/rooms/invites/${token.value}`);

const preview = computed(() =>
  isSuccessResponse<InvitePreview>(data.value) ? data.value.data : null,
);
const errorMessage = computed(() =>
  data.value && !isSuccessResponse(data.value) ? data.value.status.message : "",
);
const loading = computed(() => status.value === "pending" && !data.value);

const memberLabel = computed(() => {
  const members = preview.value?.members ?? [];
  const count = `${members.length} member${members.length === 1 ? "" : "s"}`;
  const names = members
    .map((member) => member.name.trim().split(/\s+/)[0])
    .filter((name) => name && name !== "Member");
  if (!names.length) return count;
  const shown = names.slice(0, 3).join(", ");
  const extra = names.length > 3 ? ` +${names.length - 3}` : "";
  return `${count} (${shown}${extra})`;
});

const ledgerLabel = computed(() => {
  const room = preview.value?.room;
  if (!room) return "";
  if (room.usdEnabled && room.khrEnabled) return "USD + KHR";
  if (room.usdEnabled) return "USD only";
  return "KHR only";
});

const joinAs = computed(() => {
  const name = user.value?.name?.trim();
  const email = user.value?.email?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "your account";
});

useHead({
  title: () =>
    preview.value ? `Join ${preview.value.room.name} · Tricker` : "Join room · Tricker",
});

async function onAccept() {
  const invite = preview.value;
  if (!invite || submitting.value) return;
  if (invite.alreadyMember) {
    lastRoomId.value = invite.room.id;
    await navigateTo(`/rooms/${invite.room.id}/dashboard`);
    return;
  }

  submitting.value = true;
  try {
    const res = await $fetch("/api/rooms/join", {
      method: "POST",
      body: { token: token.value },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    lastRoomId.value = res.data.roomId;
    await Promise.all([fetchSession({ force: true }), refresh()]);
    await navigateTo(`/rooms/${res.data.roomId}/dashboard`);
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: e instanceof Error ? e.message : "Could not join this room.",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UContainer class="mx-auto max-w-lg">
    <div v-if="loading" class="space-y-4">
      <USkeleton class="mx-auto h-6 w-40" />
      <USkeleton class="h-96 rounded-lg" />
    </div>

    <div v-else-if="!preview" class="space-y-4">
      <UEmpty
        icon="i-lucide-link-2-off"
        title="Invite unavailable"
        :description="errorMessage || 'This invite link is no longer valid.'"
        variant="subtle"
      />
      <div class="flex justify-center">
        <UButton label="Back to rooms" color="neutral" variant="outline" to="/rooms" />
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="flex justify-center">
        <UBadge
          label="Household invitation"
          color="neutral"
          variant="outline"
          class="font-mono tracking-wider uppercase"
        />
      </div>

      <UCard variant="outline" :ui="{ body: 'space-y-6' }">
        <div
          class="mx-auto flex size-16 items-center justify-center rounded-lg bg-elevated text-toned"
        >
          <UIcon name="i-lucide-house" class="size-8" />
        </div>

        <div class="space-y-1.5 text-center">
          <h1 class="text-2xl font-bold tracking-tight text-highlighted">
            Join {{ preview.room.name }}
          </h1>
          <p class="text-sm text-muted">
            <template v-if="preview.inviterName">
              You've been invited by
              <span class="font-semibold text-highlighted">{{ preview.inviterName }}</span>
              to share household expenses.
            </template>
            <template v-else>You've been invited to share household expenses.</template>
          </p>
        </div>

        <UBadge
          icon="i-lucide-check"
          :label="`Valid invite · ${token}`"
          color="success"
          variant="subtle"
          class="font-mono"
        />

        <div class="divide-y divide-default rounded-lg bg-muted text-left">
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <span class="text-xs font-medium text-muted">Roommates</span>
            <span class="text-right text-sm font-semibold text-highlighted">{{ memberLabel }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <span class="text-xs font-medium text-muted">Ledgers</span>
            <UBadge :label="ledgerLabel" color="neutral" variant="outline" class="font-mono" />
          </div>
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <span class="text-xs font-medium text-muted">Your role</span>
            <UBadge
              :label="preview.role === 'admin' ? 'Admin' : 'Member'"
              color="neutral"
              variant="subtle"
              class="font-mono"
            />
          </div>
        </div>

        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :title="`You will join as ${joinAs}. You can set a room nickname later in account settings.`"
        />

        <div class="space-y-2">
          <UButton
            :label="preview.alreadyMember ? 'Open room' : 'Accept and join'"
            size="lg"
            block
            :loading="submitting"
            @click="onAccept"
          />

          <div class="flex justify-center">
            <UButton label="Decline invitation" color="neutral" variant="link" to="/rooms" />
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
