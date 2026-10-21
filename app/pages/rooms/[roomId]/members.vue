<script lang="ts">
type MemberRow = {
  id: string;
  roomId: string;
  userId: string;
  role: string;
  nickname: string | null;
  userName: string;
  email: string;
  emailDisplay: string;
  avatarUrl: string | null;
  color: string | null;
  sharePercentBps: number | null;
  joinedAt: Date | string;
  leftAt: Date | string | null;
  isActive: boolean;
  name: string;
  initials: string;
  isYou: boolean;
  canEdit: boolean;
  canRemove: boolean;
  avatarUi: { readonly root: string; readonly fallback: string };
  joinedLabel: string;
  positions: Array<{
    currency: Currency;
    balance: number | null;
    formatted: string;
    colorClass: string;
  }>;
  roleLabel: string;
  roleColor: "primary" | "neutral";
  actions: DropdownMenuItem[];
};
</script>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui";

useHead({ title: "Members · Tricker" });

const { roomId } = useScopedRoom();
const { currentRoom, currentRole } = useRoomMemberships();
const { user } = useUserSession();
const toast = useToast();
const currentMonth = monthKey();

const filters = reactive({ search: "" });

const roomName = computed(() => currentRoom.value?.name ?? "this room");

const permissions = computed(() => ({
  isAdmin: currentRole.value === "admin",
  canInvite: currentRole.value === "admin" && user.value?.emailVerified !== false,
}));

const inviteTooltip = computed(() =>
  permissions.value.canInvite ? undefined : "Verify your email to invite roommates",
);

const AVATAR_UI = {
  you: { root: "bg-inverted", fallback: "text-inverted" },
  other: { root: "bg-accented", fallback: "text-default" },
} as const;

function signedMoney(amountMinor: number, currency: Currency) {
  const formatted = formatMoney({ amount_minor: amountMinor, currency });
  return amountMinor > 0 ? `+${formatted}` : formatted;
}

const {
  data: membersData,
  pending,
  status,
  refresh: refreshMembers,
} = useLazyFetch(() => `/api/rooms/${roomId.value}/members`);
const { data: overviewData, refresh: refreshOverview } = useLazyFetch(
  () => `/api/rooms/${roomId.value}/overview`,
  { query: { month: currentMonth } },
);

const currencies = computed(() =>
  (
    [
      !currentRoom.value || currentRoom.value.usdEnabled ? "USD" : null,
      !currentRoom.value || currentRoom.value.khrEnabled ? "KHR" : null,
    ] as const
  ).filter((currency): currency is Currency => currency !== null),
);

const directory = computed(() => {
  if (!isSuccessResponse(membersData.value)) return;
  const members = membersData.value.data;

  const settlement = isSuccessResponse(overviewData.value)
    ? overviewData.value.data.settlement
    : null;

  const rows: MemberRow[] = members
    .map((member) => {
      const name = member.nickname || member.userName || "Roommate";
      const isYou = member.userId === user.value?.id;
      const canEdit = permissions.value.isAdmin || isYou;
      const canRemove = permissions.value.isAdmin && !isYou;

      const positions = currencies.value.map((currency) => {
        const plan = settlement ? (currency === "USD" ? settlement.usd : settlement.khr) : null;
        const balance = plan
          ? (plan.members.find((m) => m.membershipId === member.id)?.balance ?? 0)
          : null;
        return {
          currency,
          balance,
          formatted: balance == null ? "—" : signedMoney(balance, currency),
          colorClass:
            balance == null || balance === 0
              ? "text-muted"
              : balance > 0
                ? "text-success"
                : "text-error",
        };
      });

      const row: MemberRow = {
        ...member,
        name,
        emailDisplay: member.email || "—",
        initials: payerInitials(name),
        isYou,
        canEdit,
        canRemove,
        avatarUi: isYou ? AVATAR_UI.you : AVATAR_UI.other,
        joinedLabel: toDayJS(member.joinedAt).tz(PHNOM_PENH_TZ).format("MMM DD, YYYY"),
        positions,
        roleLabel: member.role === "admin" ? "Admin" : "Member",
        roleColor: member.role === "admin" ? ("primary" as const) : ("neutral" as const),
        actions: [],
      };

      if (canEdit) {
        row.actions.push({
          label: "Edit nickname",
          icon: "i-lucide-pencil",
          onSelect: () => openNickname(row),
        });
      }
      if (canRemove) {
        row.actions.push({
          label: "Remove",
          icon: "i-lucide-trash",
          color: "error",
          onSelect: () => {
            interaction.memberToRemove = row;
          },
        });
      }

      return row;
    })
    .sort(
      (a, b) =>
        Number(b.isYou) - Number(a.isYou) || String(a.joinedAt).localeCompare(String(b.joinedAt)),
    );

  return { rows };
});

const visible = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const rows = (directory.value?.rows ?? []).filter(
    (row) =>
      !search ||
      [row.name, row.userName, row.email].some((value) => value.toLowerCase().includes(search)),
  );
  return { rows };
});

const emptyState = computed(() => {
  const hasMembers = (directory.value?.rows.length ?? 0) > 0;
  return {
    title: hasMembers ? "No matching roommates" : "No roommates yet",
    description: hasMembers
      ? "Try another name or email."
      : "Invite a roommate to share this room.",
    canClear: hasMembers,
  };
});

const interaction = shallowReactive({
  editing: null as MemberRow | null,
  nicknameOpen: false,
  inviteOpen: false,
  memberToRemove: null as MemberRow | null,
  get removeOpen(): boolean {
    return this.memberToRemove !== null;
  },
  set removeOpen(open: boolean) {
    if (!open) this.memberToRemove = null;
  },
});

const removeTitle = computed(() => `Remove ${interaction.memberToRemove?.name ?? "roommate"}?`);

function openNickname(row: MemberRow) {
  if (!row.canEdit) return;
  interaction.editing = row;
  interaction.nicknameOpen = true;
}

watch(roomId, () => {
  filters.search = "";
  interaction.nicknameOpen = false;
  interaction.inviteOpen = false;
  interaction.memberToRemove = null;
});

watch(
  () => interaction.nicknameOpen,
  (open) => {
    if (!open) interaction.editing = null;
  },
);

watch(
  () => status.value === "error" || (status.value === "success" && !directory.value),
  (failed) => {
    if (!failed || import.meta.server) return;
    toast.add({
      title: "Could not load members",
      description: "Your room data is unavailable. Please try again.",
      duration: 0,
      color: "error",
      icon: "i-lucide-circle-alert",
      actions: [
        {
          label: "Try again",
          color: "error",
          variant: "outline",
          onClick: () => refreshMembers(),
        },
      ],
    });
  },
  { immediate: true },
);

async function refreshAll() {
  await Promise.all([refreshMembers(), refreshOverview()]);
}

async function onRemoveMember(close: () => void) {
  const member = interaction.memberToRemove;
  if (!member || !member.canRemove) return;
  try {
    const res = await $fetch(`/api/rooms/${roomId.value}/members/${member.id}`, {
      method: "DELETE",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    close();
    await refreshAll();
    toast.add({ icon: "i-lucide-circle-check", title: "Roommate removed", color: "success" });
  } catch (error) {
    toast.add({
      title: "Could not remove roommate",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}

const columns: TableColumn<MemberRow>[] = [
  { id: "member", header: "Member" },
  { id: "email", header: "Email" },
  { id: "role", header: "Role" },
  { id: "joined", header: "Joined" },
  { id: "position", header: "Position", meta: { class: { th: "text-right", td: "text-right" } } },
  { id: "actions", header: "Actions", meta: { class: { th: "text-right", td: "text-right" } } },
];
</script>

<template>
  <UContainer class="max-w-6xl space-y-5">
    <div
      class="flex flex-col justify-between gap-4 border-b border-default pb-5 lg:flex-row lg:items-end"
    >
      <div class="min-w-0 space-y-1.5">
        <p class="flex items-center gap-2 font-mono text-xs tracking-wider text-muted uppercase">
          Household <span>·</span>
          <span class="truncate normal-case">{{ roomName }}</span>
        </p>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Members</h1>
        <p class="max-w-lg text-sm text-muted">
          Roommates in
          <span class="font-medium text-default">{{ roomName }}</span
          >, and who can invite or remove them.
        </p>
      </div>

      <UTooltip v-if="permissions.isAdmin" :text="inviteTooltip">
        <div class="hidden lg:inline-flex">
          <UButton
            icon="i-lucide-user-plus"
            label="Invite roommate"
            :disabled="!permissions.canInvite"
            @click="interaction.inviteOpen = true"
          />
        </div>
      </UTooltip>
    </div>

    <div v-if="!directory && (pending || status === 'pending')" class="space-y-5" role="status">
      <USkeleton class="h-10 w-full rounded-lg sm:w-56" />
      <USkeleton class="h-80 rounded-lg" />
    </div>

    <template v-else-if="directory">
      <div class="flex items-center gap-2 sm:justify-end">
        <UInput
          v-model="filters.search"
          icon="i-lucide-search"
          placeholder="Filter members or emails…"
          class="min-w-0 flex-1 sm:w-56 sm:flex-none"
        />
        <UTooltip v-if="permissions.isAdmin" :text="inviteTooltip">
          <div class="inline-flex lg:hidden">
            <UButton
              icon="i-lucide-user-plus"
              label="Invite"
              :disabled="!permissions.canInvite"
              @click="interaction.inviteOpen = true"
            />
          </div>
        </UTooltip>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div v-if="!visible.rows.length" class="space-y-3 px-4 py-14 text-center">
          <UIcon name="i-lucide-users" class="size-9 text-dimmed" />
          <h2 class="text-sm font-semibold text-highlighted">{{ emptyState.title }}</h2>
          <p class="text-sm text-muted">{{ emptyState.description }}</p>
          <UButton
            v-if="emptyState.canClear"
            label="Clear search"
            color="neutral"
            variant="outline"
            @click="filters.search = ''"
          />
        </div>

        <template v-else>
          <ul class="divide-y divide-default lg:hidden">
            <UContextMenu v-for="row in visible.rows" :key="row.id" :items="row.actions">
              <li class="flex items-start gap-2.5 px-3 py-4 sm:px-5">
                <UAvatar
                  :src="row.avatarUrl || undefined"
                  :text="row.initials"
                  size="sm"
                  :ui="row.avatarUi"
                />
                <div class="min-w-0 flex-1 space-y-1">
                  <component
                    :is="row.canEdit ? 'button' : 'p'"
                    :type="row.canEdit ? 'button' : undefined"
                    class="block w-full truncate text-left text-sm font-semibold text-highlighted"
                    :class="{
                      'cursor-pointer hover:underline focus-visible:outline-primary': row.canEdit,
                    }"
                    @click="openNickname(row)"
                  >
                    {{ row.name }}
                    <span v-if="row.isYou" class="font-mono text-xs font-normal text-dimmed"
                      >(You)</span
                    >
                  </component>
                  <p class="truncate font-mono text-xs text-muted">{{ row.emailDisplay }}</p>
                  <p class="font-mono text-[11px] text-dimmed">Joined {{ row.joinedLabel }}</p>
                </div>
                <div class="max-w-28 shrink-0 space-y-1 text-right">
                  <UBadge
                    :label="row.roleLabel"
                    :color="row.roleColor"
                    variant="subtle"
                    size="sm"
                  />
                  <p
                    v-for="position in row.positions"
                    :key="position.currency"
                    class="truncate font-mono text-[11px] font-semibold tabular-nums"
                    :class="position.colorClass"
                  >
                    {{ position.formatted }}
                  </p>
                </div>
              </li>
            </UContextMenu>
          </ul>

          <UTable
            :data="visible.rows"
            :columns="columns"
            class="hidden lg:block"
            :watch-options="{ deep: false }"
            :ui="{
              thead: 'bg-muted/50',
              th: 'font-mono text-xs tracking-wider uppercase text-muted',
              td: 'py-4',
              tr: 'hover:bg-muted/50',
            }"
          >
            <template #member-cell="{ row }">
              <div class="flex items-center gap-3">
                <UAvatar
                  :src="row.original.avatarUrl || undefined"
                  :text="row.original.initials"
                  size="sm"
                  :ui="row.original.avatarUi"
                />
                <component
                  :is="row.original.canEdit ? 'button' : 'p'"
                  :type="row.original.canEdit ? 'button' : undefined"
                  class="block max-w-56 truncate text-left font-semibold text-highlighted"
                  :class="{
                    'cursor-pointer hover:underline focus-visible:outline-primary':
                      row.original.canEdit,
                  }"
                  @click="openNickname(row.original)"
                >
                  {{ row.original.name }}
                  <span v-if="row.original.isYou" class="font-mono text-xs font-normal text-dimmed">
                    (You)
                  </span>
                </component>
              </div>
            </template>

            <template #email-cell="{ row }">
              <span class="font-mono text-xs text-muted">{{ row.original.emailDisplay }}</span>
            </template>

            <template #role-cell="{ row }">
              <UBadge
                :label="row.original.roleLabel"
                :color="row.original.roleColor"
                variant="subtle"
              />
            </template>

            <template #joined-cell="{ row }">
              <span class="font-mono text-xs text-muted">{{ row.original.joinedLabel }}</span>
            </template>

            <template #position-cell="{ row }">
              <p
                v-for="position in row.original.positions"
                :key="position.currency"
                class="font-mono text-sm font-semibold tabular-nums"
                :class="position.colorClass"
              >
                {{ position.formatted }}
              </p>
            </template>

            <template #actions-cell="{ row }">
              <UDropdownMenu
                v-if="row.original.actions.length"
                :items="row.original.actions"
                :content="{ align: 'end' }"
              >
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  aria-label="Member actions"
                />
              </UDropdownMenu>
            </template>
          </UTable>
        </template>
      </UCard>
    </template>

    <MembersInviteModal
      v-if="permissions.canInvite"
      v-model:open="interaction.inviteOpen"
      :room-id="roomId"
    />

    <NicknameForm
      v-model:open="interaction.nicknameOpen"
      :room-id="roomId"
      :room-name="roomName"
      :member="interaction.editing"
      @refresh="refreshMembers"
    />

    <RemoveModal
      v-model:open="interaction.removeOpen"
      :title="removeTitle"
      description="They'll lose access to this room and can rejoin with a new invite."
      :on-delete="onRemoveMember"
    />
  </UContainer>
</template>
