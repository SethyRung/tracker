<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";

useHead({ title: "Members · Tricker" });
definePageMeta({
  auth: { only: "user" },
});

const { user } = useUserSession();

const roomId = computed(() => user.value?.roomId ?? null);

const { data, refresh: refreshMembers } = await useFetch(
  () => `/api/rooms/${roomId.value}/members`,
);

const members = computed(() => {
  if (!isSuccessResponse(data.value)) {
    return [];
  }
  return data.value.data;
});

type Member = (typeof members.value)[number];

const isAdmin = computed(() =>
  (members.value ?? []).some((m) => m.userId === user.value?.id && m.role === "admin"),
);

const inviteOpen = ref(false);

const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

const memberToRemove = ref<Member | null>(null);
const columns: TableColumn<Member>[] = [
  {
    id: "member",
    header: "Member",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-3" }, [
        h(UAvatar, {
          src: row.original.avatarUrl,
          text: row.original.displayName
            .split(/\s+/)
            .map((p) => p.charAt(0))
            .slice(0, 2)
            .join("")
            .toUpperCase(),
        }),
        h("p", { class: "text-sm font-medium text-default truncate" }, [
          row.original.displayName,
          row.original.nickname
            ? h("span", { class: "text-toned font-normal" }, ` "${row.original.nickname}"`)
            : null,
        ]),
      ]),
  },
  {
    id: "role",
    header: "Role",
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.role === "admin" ? "Admin" : "Member",
        color: row.original.role === "admin" ? "primary" : "neutral",
        variant: "soft",
      }),
    meta: { class: { td: "whitespace-nowrap", th: "whitespace-nowrap" } },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      isAdmin.value && row.original.userId !== user.value?.id
        ? h(UButton, {
            icon: "i-lucide-trash",
            color: "error",
            variant: "ghost",
            "aria-label": "Remove member",
            onClick: () => {
              memberToRemove.value = row.original;
            },
          })
        : null,
    meta: { class: { td: "text-right", th: "sr-only" } },
  },
];
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <UPageCard
      v-if="!roomId"
      icon="i-lucide-info"
      title="No room yet"
      description="Create or join a room before managing members."
    />

    <template v-else>
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-1">
          <p class="font-mono text-xs uppercase tracking-wider text-toned">Room</p>
          <h1 class="font-pixel-circle text-2xl text-primary">Members</h1>
          <p class="text-xs text-toned">
            {{ members.length }} member{{ members.length === 1 ? "" : "s" }}
          </p>
        </div>
        <UButton
          v-if="isAdmin"
          icon="i-lucide-user-plus"
          label="Invite"
          @click="
            () => {
              inviteOpen = true;
            }
          "
        />
      </div>

      <UTable :data="members" :columns="columns">
        <template #empty>
          <div class="text-center py-10 space-y-2">
            <UIcon name="i-lucide-users" class="size-8 text-dimmed mx-auto" />
            <p class="text-sm text-muted">No members yet</p>
            <p class="text-xs text-dimmed">Invite someone to get started.</p>
            <UButton
              v-if="isAdmin"
              icon="i-lucide-user-plus"
              label="Invite"
              class="mt-1"
              @click="
                () => {
                  inviteOpen = true;
                }
              "
            />
          </div>
        </template>
      </UTable>

      <MembersInviteModal v-model:open="inviteOpen" :room-id="roomId" />
      <MembersRemoveModal
        :open="memberToRemove !== null"
        :room-id="roomId"
        :member="memberToRemove"
        @removed="refreshMembers"
      />
    </template>
  </UContainer>
</template>
