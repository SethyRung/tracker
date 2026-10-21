<script setup lang="ts">
import { overviewCsv, summarizeOverviewEntries } from "#shared/utils/overview";

useHead({ title: "Overview · Tricker" });

const { roomId } = useScopedRoom();
const { currentRoom, currentRole } = useRoomMemberships();
const { user } = useUserSession();
const currentMonth = monthKey();
const monthLabel = toDayJS(currentMonth, "YYYY-MM").format("MMMM YYYY");
const isAdmin = computed(() => currentRole.value === "admin");
const inviteOpen = ref(false);

const { data, status, pending, refresh } = useLazyFetch(
  () => `/api/rooms/${roomId.value}/overview`,
  {
    query: { month: currentMonth },
  },
);

const overview = computed(() => {
  const result = data.value?.data;
  if (!result) return;

  const { members, categories, settlement } = result;
  const entries = result.entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const plans = [settlement.usd, settlement.khr];
  const currentMember = members.find((member) => member.userId === user.value?.id);

  return {
    members,
    entries,
    monthClosed: result.snapshot.status === "closed",
    memberById: new Map(members.map((member) => [member.id, member])),
    categoryById: new Map(categories.map((category) => [category.id, category])),
    ledgers: summarizeOverviewEntries(entries),
    draftCount: entries.filter((entry) => entry.status === "draft").length,
    recentEntries: entries.slice(0, 5),
    positions: plans.map((plan) => ({
      currency: plan.currency,
      balance:
        plan.members.find((member) => member.membershipId === currentMember?.id)?.balance ?? 0,
    })),
    transfers: plans.flatMap((plan) =>
      plan.suggestTransfer.map((transfer) => ({ ...transfer, currency: plan.currency })),
    ),
  };
});
const settlePath = computed(() => `/rooms/${roomId.value}/settle/${currentMonth}`);
const entriesPath = computed(() => `/rooms/${roomId.value}/entries`);
const toast = useToast();

watch(
  () => status.value === "error" || (status.value === "success" && !overview.value),
  (failed) => {
    if (!failed || import.meta.server) return;

    toast.add({
      title: "Could not load overview",
      description: "Your room data is unavailable. Please try again.",
      color: "error",
      icon: "i-lucide-circle-alert",
      actions: [
        { label: "Try again", color: "error", variant: "outline", onClick: () => refresh() },
      ],
    });
  },
  { immediate: true },
);

function money(amountMinor: number, currency: Currency) {
  return formatMoney({ amount_minor: amountMinor, currency });
}

function memberLabel(id: string) {
  const m = overview.value?.memberById.get(id);
  return m ? m.nickname || m.userName || "Roommate" : "Former roommate";
}

function categoryName(id: string | null) {
  return (id && overview.value?.categoryById.get(id)?.name) || "Uncategorized";
}

function billPath(entry: NonNullable<typeof overview.value>["entries"][number]) {
  const canEdit =
    isAdmin.value || (entry.status === "published" && entry.createdByUserId === user.value?.id);
  return canEdit && !overview.value?.monthClosed
    ? `${entriesPath.value}?edit=${entry.id}`
    : entriesPath.value;
}

function exportCsv() {
  if (!overview.value) return;

  const csv = overviewCsv(
    overview.value.entries.map((entry) => ({
      ...entry,
      description: entryTitle(entry.notes, categoryName(entry.categoryId)),
      category: categoryName(entry.categoryId),
      paidBy: memberLabel(entry.paidByMembershipId),
    })),
  );
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tricker-${roomId.value}-${currentMonth}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <UContainer class="max-w-6xl space-y-6 pb-20 lg:pb-0">
    <AuthEmailVerificationBanner />

    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight wrap-break-word text-highlighted">
            {{ currentRoom?.name || "Room overview" }}
          </h1>

          <UBadge
            v-if="overview && status === 'success'"
            :color="overview.monthClosed ? 'neutral' : 'success'"
            variant="subtle"
            :icon="overview.monthClosed ? 'i-lucide-lock' : 'i-lucide-circle-dot'"
            :label="`${monthLabel} · ${overview.monthClosed ? 'Closed' : 'Open'}`"
            class="rounded-full"
          />
        </div>

        <p class="text-sm text-muted">
          <span v-if="overview">
            {{ overview.members.length }} roommate{{ overview.members.length === 1 ? "" : "s" }} ·
          </span>
          Parallel USD and KHR ledgers
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          icon="i-lucide-download"
          label="Export CSV"
          color="neutral"
          variant="subtle"
          :disabled="!overview?.entries.length"
          @click="exportCsv"
        />
        <UButton
          icon="i-lucide-handshake"
          label="Settle month"
          color="neutral"
          variant="subtle"
          :to="settlePath"
        />
        <UButton
          v-if="!overview?.monthClosed"
          class="hidden lg:inline-flex"
          icon="i-lucide-plus"
          label="Add bill"
          :to="`${entriesPath}?new=true`"
        />
      </div>
    </div>

    <div v-if="pending" class="space-y-6" role="status">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <USkeleton class="col-span-2 h-52 rounded-lg lg:col-span-1" />
        <USkeleton v-for="i in 2" :key="i" class="h-52 rounded-lg" />
      </div>
      <USkeleton class="h-80 rounded-lg" />
    </div>

    <template v-else-if="overview">
      <UAlert
        v-if="isAdmin && overview.draftCount && !overview.monthClosed"
        color="warning"
        variant="subtle"
        icon="i-lucide-file-pen-line"
        :title="`${overview.draftCount} draft${overview.draftCount === 1 ? '' : 's'} to publish`"
        description="Drafts are excluded from balances and ledger totals."
        :actions="[
          { label: 'Review drafts', to: entriesPath, color: 'warning', variant: 'outline' },
        ]"
      />

      <section class="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        <UCard
          :ui="{
            root: 'col-span-2 lg:col-span-1',
            body: 'flex h-full flex-col p-4 sm:p-5 space-y-4',
          }"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
              Your net balance
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
              label="Settled monthly"
              size="sm"
              class="rounded-full"
            />
          </div>

          <div class="space-y-3">
            <div
              v-for="position in overview.positions"
              :key="position.currency"
              class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
            >
              <span class="text-sm text-muted">
                {{ position.currency }} ·
                {{
                  position.balance > 0
                    ? "You get back"
                    : position.balance < 0
                      ? "You owe"
                      : "You are even"
                }}
              </span>
              <span
                class="font-mono text-xl font-semibold tracking-tight tabular-nums"
                :class="
                  position.balance > 0
                    ? 'text-success'
                    : position.balance < 0
                      ? 'text-error'
                      : 'text-highlighted'
                "
                >{{ position.balance > 0 ? "+" : ""
                }}{{ money(Math.abs(position.balance), position.currency) }}</span
              >
            </div>
          </div>

          <USeparator />

          <div class="flex items-center justify-between gap-2 text-xs text-muted">
            <UAvatarGroup size="2xs" :max="4">
              <UAvatar
                v-for="m in overview.members"
                :key="m.id"
                :alt="memberLabel(m.id)"
                color="neutral"
              />
            </UAvatarGroup>

            <span>{{ monthLabel }}</span>
          </div>
        </UCard>

        <UCard
          v-for="currency in ['USD', 'KHR'] as const"
          :key="currency"
          :ui="{ body: 'flex h-full flex-col p-4 sm:p-5 space-y-4' }"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
            >
              <UIcon
                :name="currency === 'USD' ? 'i-lucide-dollar-sign' : 'i-lucide-banknote'"
                class="size-4"
              />
            </span>
            <h2 class="text-sm font-medium text-highlighted">{{ currency }} Ledger</h2>
          </div>
          <div class="space-y-1">
            <p
              class="font-mono text-lg font-semibold tracking-tight break-all text-highlighted tabular-nums sm:text-2xl"
            >
              {{ money(overview.ledgers[currency].amountMinor, currency) }}
            </p>
            <p class="text-xs text-muted">
              {{ overview.ledgers[currency].count }} published bill{{
                overview.ledgers[currency].count === 1 ? "" : "s"
              }}
            </p>
          </div>

          <USeparator />

          <p class="text-xs text-muted">
            {{ currency === "USD" ? "US dollar ledger" : "Cambodian riel ledger" }} · No conversion
          </p>
        </UCard>
      </section>

      <div class="grid items-start gap-5 lg:grid-cols-3">
        <UCard
          class="min-w-0 lg:col-span-2"
          :ui="{
            header: 'px-4 py-3 sm:px-5',
            body: 'p-0 sm:p-0',
            footer: 'px-4 py-3 sm:px-5 bg-muted/50',
          }"
        >
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
                Recent household bills
              </h2>

              <UButton
                label="View ledger"
                :to="entriesPath"
                color="neutral"
                variant="link"
                size="xs"
                trailing-icon="i-lucide-arrow-right"
              />
            </div>
          </template>

          <ul v-if="overview.recentEntries.length" class="divide-y divide-default">
            <li v-for="entry in overview.recentEntries" :key="entry.id">
              <NuxtLink
                :to="billPath(entry)"
                class="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5"
              >
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-toned"
                  aria-hidden="true"
                >
                  <UIcon :name="categoryIcon(categoryName(entry.categoryId))" class="size-4" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-highlighted">
                    {{ entryTitle(entry.notes, categoryName(entry.categoryId)) }}
                  </p>
                  <p
                    class="mt-1 truncate text-xs text-muted"
                    :title="splitLabel(entry.weights, memberLabel)"
                  >
                    Paid by {{ memberLabel(entry.paidByMembershipId) }} ·
                    {{ splitLabel(entry.weights, memberLabel) }}
                  </p>
                  <p class="mt-1 text-xs text-dimmed">
                    {{ toDayJS(entry.date).tz(PHNOM_PENH_TZ).format("MMM D") }}
                  </p>
                </div>
                <div class="shrink-0 space-y-1 text-right">
                  <p class="font-mono text-sm font-semibold text-highlighted tabular-nums">
                    {{ money(entry.amountMinor, entry.currency) }}
                  </p>
                  <UBadge
                    :label="entry.status === 'draft' ? 'Draft' : 'Published'"
                    :color="entry.status === 'draft' ? 'warning' : 'neutral'"
                    size="sm"
                    variant="subtle"
                  />
                </div>
              </NuxtLink>
            </li>
          </ul>

          <div v-else class="space-y-3 px-4 py-12 text-center">
            <UIcon name="i-lucide-receipt" class="size-8 text-dimmed" />
            <p class="text-sm font-medium text-highlighted">No bills this month</p>
            <p class="text-sm text-muted">
              {{
                overview.monthClosed
                  ? "This month is closed."
                  : "Add your first bill to start tracking together."
              }}
            </p>
            <UButton
              v-if="!overview.monthClosed"
              icon="i-lucide-plus"
              label="Add a bill"
              :to="`${entriesPath}?new=true`"
            />
          </div>

          <template v-if="overview.entries.length" #footer>
            <p class="text-center text-xs text-muted">
              Showing {{ overview.recentEntries.length }} of {{ overview.entries.length }} bills in
              {{ monthLabel }}.
            </p>
          </template>
        </UCard>

        <aside class="min-w-0 space-y-5">
          <UCard :ui="{ body: 'space-y-4 p-4 sm:p-5' }">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
                Monthly net transfers
              </h2>
              <UIcon name="i-lucide-arrow-right-left" class="size-4 text-dimmed" />
            </div>
            <ul v-if="overview.transfers.length" class="space-y-2">
              <li
                v-for="transfer in overview.transfers"
                :key="`${transfer.currency}:${transfer.fromMembershipId}:${transfer.toMembershipId}`"
                class="flex items-start gap-2.5 rounded-md border border-default bg-muted/50 p-3"
              >
                <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-4 shrink-0 text-muted" />
                <p class="min-w-0 text-xs leading-relaxed wrap-break-word">
                  <span class="font-medium text-highlighted">{{ transfer.fromName }}</span>
                  {{ " owes " }}
                  <span class="font-medium text-highlighted">{{ transfer.toName }}</span>
                  {{ " " }}
                  <span class="font-mono font-semibold text-highlighted">{{
                    money(transfer.amountMinor, transfer.currency)
                  }}</span>
                </p>
              </li>
            </ul>
            <div v-else class="flex items-start gap-2 text-sm text-muted">
              <UIcon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0 text-success" />
              <p>
                {{
                  overview.entries.some((e) => e.status === "published")
                    ? "Everyone is even. No transfers needed."
                    : "Transfers will appear once bills are published."
                }}
              </p>
            </div>
            <p class="text-xs leading-relaxed text-muted">
              Calculated from published bills and each bill’s split. USD and KHR stay separate.
            </p>
            <UButton
              block
              icon="i-lucide-handshake"
              :label="overview.monthClosed ? 'View settlement' : 'Review settlement'"
              :to="settlePath"
            />
          </UCard>

          <UCard :ui="{ body: 'space-y-4 p-4 sm:p-5' }">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-mono text-xs font-medium tracking-wider text-muted uppercase">
                Roommates ({{ overview.members.length }})
              </h2>
              <span class="text-xs text-dimmed">{{ overview.members.length }} active</span>
            </div>
            <ul class="space-y-3">
              <li v-for="m in overview.members" :key="m.id" class="flex items-center gap-2.5">
                <UAvatar :alt="memberLabel(m.id)" color="neutral" size="xs" />
                <p class="min-w-0 flex-1 truncate text-sm font-medium text-highlighted">
                  {{ memberLabel(m.id) }}
                  <span v-if="m.userId === user?.id" class="text-xs font-normal text-muted"
                    >(you)</span
                  >
                </p>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  :label="m.role === 'admin' ? 'Admin' : 'Member'"
                  class="rounded-full"
                />
              </li>
            </ul>
            <UButton
              v-if="isAdmin"
              label="Invite roommate"
              icon="i-lucide-user-plus"
              color="neutral"
              variant="link"
              size="sm"
              class="p-0"
              @click="inviteOpen = true"
            />
            <UButton
              v-else
              label="View roommates"
              icon="i-lucide-users"
              color="neutral"
              variant="link"
              size="sm"
              class="p-0"
              :to="`/rooms/${roomId}/members`"
            />
          </UCard>
        </aside>
      </div>
    </template>

    <MembersInviteModal v-if="isAdmin" v-model:open="inviteOpen" :room-id="roomId" />
  </UContainer>
</template>
