<script setup lang="ts">
useHead({ title: "Members · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const toast = useToast();

const { user } = useUserSession();
if (!user.value) await navigateTo("/sign-in");

const { data: roomId } = await useFetch("/api/rooms/current", {
  transform: (res) => res?.data?.room?.id,
});

interface MemberRow {
  id: string;
  userId: string;
  displayName: string;
  nickname: string | null;
  color: string | null;
  role: "admin" | "member";
}

const { data: members, refresh: refreshMembers } = await useFetch(
  () => `/api/rooms/${roomId.value}/members`,
  {
    transform: (r) => (r?.data?.members ?? []) as MemberRow[],
    default: () => [] as MemberRow[],
  },
);

const isAdmin = computed(() =>
  (members.value ?? []).some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const lastInvite = ref<{ token: string; expiresAt: string } | null>(null);
const showInviteModal = computed({
  get: () => lastInvite.value !== null,
  set: (v) => {
    if (!v) lastInvite.value = null;
  },
});
const creatingInvite = ref(false);

async function createInvite() {
  if (!roomId.value) return;
  creatingInvite.value = true;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/invite-links`, { method: "POST" });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    lastInvite.value = res.data as typeof lastInvite.value;
    toast.add({ icon: "i-lucide:circle-check", title: "Invite created" });
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create invite.",
    });
  } finally {
    creatingInvite.value = false;
  }
}

const inviteUrl = computed(() => {
  if (!lastInvite.value) return "";
  if (typeof window === "undefined") return `/join/${lastInvite.value.token}`;
  return `${window.location.origin}/join/${lastInvite.value.token}`;
});

async function copyInvite() {
  if (!inviteUrl.value) return;
  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    toast.add({ icon: "i-lucide:circle-check", title: "Copied" });
  } catch {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Could not copy",
      description: "Long-press the URL to copy it manually.",
    });
  }
}

async function removeMember(member: MemberRow) {
  if (!roomId.value) return;
  if (
    !confirm(
      `Remove ${member.displayName} from the room? They can rejoin with a new invite if needed.`,
    )
  ) {
    return;
  }
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/members/${member.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide:circle-check", title: "Removed" });
    await refreshMembers();
  } catch (e) {
    toast.add({
      icon: "i-lucide:circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not remove member.",
    });
  }
}

function avatarColor(member: MemberRow) {
  return member.color ?? "#a1a1aa";
}

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
</script>

<template>
  <UContainer class="py-4 max-w-2xl">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="font-pixel-circle text-2xl text-primary">Members</h1>
        <p class="text-xs text-toned mt-1">
          {{ members.length }} member{{ members.length === 1 ? "" : "s" }}
        </p>
      </div>
      <UButton
        v-if="isAdmin"
        icon="i-lucide-user-plus"
        label="Invite"
        @click="createInvite"
        :loading="creatingInvite"
      />
    </div>

    <UAlert
      v-if="!roomId"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before managing members."
    />

    <template v-else>
      <ul class="space-y-3">
        <li
          v-for="member in members"
          :key="member.id"
          class="rounded-lg border border-default p-3 flex items-center gap-3"
        >
          <div
            class="size-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            :style="{ backgroundColor: avatarColor(member), color: 'white' }"
          >
            {{ avatarInitials(member.displayName) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ member.displayName }}
              <span v-if="member.nickname" class="text-toned">"{{ member.nickname }}"</span>
            </p>
            <p class="text-xs text-toned">{{ member.role === "admin" ? "Admin" : "Member" }}</p>
          </div>
          <UButton
            v-if="isAdmin && member.userId !== user?.id"
            icon="i-lucide-trash"
            color="error"
            variant="ghost"
            size="sm"
            aria-label="Remove"
            @click="removeMember(member)"
          />
        </li>
      </ul>

      <UModal v-model:open="showInviteModal">
        <template #content>
          <UCard>
            <template #header>
              <h3 class="text-sm font-semibold">Invite link created</h3>
            </template>
            <p class="text-sm text-toned mb-3">
              Share this URL with the person you want to invite. It's single-use and expires in 7
              days.
            </p>
            <div class="flex items-center gap-2">
              <UInput :model-value="inviteUrl" readonly class="flex-1" />
              <UButton icon="i-lucide-copy" label="Copy" @click="copyInvite" />
            </div>
            <div class="flex justify-end mt-4">
              <UButton label="Done" @click="lastInvite = null" />
            </div>
          </UCard>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
