<script setup lang="ts">
const { rooms, status } = useRoomMemberships();
const lastRoomId = useLastRoomId();

const loading = computed(() => status.value === "pending" && rooms.value.length === 0);
const onboarding = computed(() => !loading.value && rooms.value.length === 0);
const createOpen = ref(false);
const joinOpen = ref(false);
const query = ref("");

useHead({
  title: () => (onboarding.value ? "Welcome · Tricker" : "Choose a room · Tricker"),
});

const lastRoom = computed(() => rooms.value.find((r) => r.id === lastRoomId.value) ?? null);

const sortedRooms = computed(() => {
  const last = lastRoomId.value;
  if (!last) return rooms.value;
  return [...rooms.value].sort((a, b) => Number(b.id === last) - Number(a.id === last));
});

const filteredRooms = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return sortedRooms.value;
  return sortedRooms.value.filter((r) => r.name.toLowerCase().includes(q));
});

const showLastVisited = computed(() => {
  const room = lastRoom.value;
  if (!room) return false;
  return filteredRooms.value.some((r) => r.id === room.id);
});

const roomCountLabel = computed(() => {
  const n = rooms.value.length;
  return `${n} active household${n === 1 ? "" : "s"}`;
});

function openRoom(id: string) {
  lastRoomId.value = id;
}

function roomInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function roomMeta(r: (typeof rooms.value)[number]) {
  return `${r.memberCount} member${r.memberCount === 1 ? "" : "s"} · ${r.role === "admin" ? "Admin" : "Member"}`;
}

function ledgerLabel(r: (typeof rooms.value)[number]) {
  if (r.usdEnabled && r.khrEnabled) return "USD + KHR";
  if (r.usdEnabled) return "USD only";
  return "KHR only";
}
</script>

<template>
  <UContainer>
    <div v-if="loading" class="space-y-6">
      <div class="max-w-xl space-y-3">
        <USkeleton class="h-3 w-24" />
        <USkeleton class="h-8 w-48" />
        <USkeleton class="h-4 w-full max-w-md" />
      </div>
      <USkeleton class="h-24 rounded-2xl" />
      <div class="grid gap-3 lg:grid-cols-3">
        <USkeleton v-for="i in 3" :key="i" class="h-40 rounded-2xl" />
      </div>
    </div>

    <template v-else>
      <Onboarding v-if="onboarding" />

      <div v-else class="space-y-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="max-w-xl space-y-1">
            <p class="font-mono text-xs tracking-wider text-toned uppercase">Households</p>

            <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
              Choose a room
            </h1>

            <p class="text-sm text-muted">
              Manage multiple shared living spaces across separate currency ledgers.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-ticket"
              label="Join room"
              color="neutral"
              variant="outline"
              @click="joinOpen = true"
            />

            <UButton icon="i-lucide-plus" label="Create room" @click="createOpen = true" />
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <UBadge
            :label="roomCountLabel"
            color="neutral"
            variant="outline"
            class="w-fit font-mono"
          />

          <UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="Search rooms"
            color="neutral"
            variant="outline"
            class="w-full sm:max-w-xs"
          />
        </div>

        <section
          v-if="lastRoom && showLastVisited"
          class="flex flex-col gap-4 rounded-2xl border border-primary/40 bg-default p-4 sm:flex-row sm:items-center sm:justify-between dark:border-default"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"
            >
              <UIcon name="i-lucide-house" class="size-5" />
            </span>
            <div class="min-w-0">
              <p class="font-mono text-[11px] tracking-wider text-toned uppercase">Last visited</p>
              <p class="truncate text-base font-bold text-highlighted">{{ lastRoom.name }}</p>
              <p class="text-xs text-muted">{{ ledgerLabel(lastRoom) }}</p>
            </div>
          </div>

          <UButton
            :to="`/rooms/${lastRoom.id}/dashboard`"
            size="lg"
            class="w-full justify-center font-semibold sm:w-auto sm:shrink-0"
            @click="openRoom(lastRoom.id)"
          >
            <span class="sm:hidden">Continue in {{ lastRoom.name }}</span>
            <span class="hidden sm:inline">Continue to dashboard</span>
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </UButton>
        </section>

        <UEmpty
          v-if="filteredRooms.length === 0"
          icon="i-lucide-search"
          title="No matching rooms"
          description="Try a different name."
          variant="subtle"
        />

        <template v-else>
          <div class="space-y-3 lg:hidden">
            <div
              class="flex items-center justify-between font-mono text-[11px] tracking-wider text-dimmed uppercase"
            >
              <span>All rooms</span>
              <span>{{ filteredRooms.length }} total</span>
            </div>

            <ul
              class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-default"
            >
              <li v-for="r in filteredRooms" :key="r.id">
                <NuxtLink
                  :to="`/rooms/${r.id}/dashboard`"
                  class="flex min-h-16 items-center gap-3 px-4 py-3.5 hover:bg-elevated/60"
                  @click="openRoom(r.id)"
                >
                  <UAvatar
                    :text="roomInitial(r.name)"
                    size="md"
                    :color="r.id === lastRoomId ? 'primary' : 'neutral'"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <p class="truncate text-sm font-semibold text-highlighted">{{ r.name }}</p>
                      <UBadge
                        v-if="r.id === lastRoomId"
                        label="Last used"
                        color="primary"
                        variant="subtle"
                        size="xs"
                      />
                    </div>
                    <p class="truncate text-xs text-muted">
                      {{ roomMeta(r) }} · {{ ledgerLabel(r) }}
                    </p>
                  </div>
                  <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed" />
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div class="hidden gap-4 lg:grid lg:grid-cols-3">
            <UCard
              v-for="r in filteredRooms"
              :key="r.id"
              variant="outline"
              :class="r.id === lastRoomId ? 'ring-primary/40 dark:ring-default' : undefined"
              :ui="{ root: 'h-full', body: 'flex h-full flex-col justify-between gap-4' }"
            >
              <div>
                <div class="flex items-start gap-3">
                  <UAvatar
                    :text="roomInitial(r.name)"
                    size="md"
                    :color="r.id === lastRoomId ? 'primary' : 'neutral'"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-semibold text-highlighted">{{ r.name }}</p>
                    <p class="text-xs text-muted">{{ roomMeta(r) }}</p>
                  </div>
                </div>

                <div class="mt-3 flex flex-wrap gap-1.5">
                  <UBadge
                    :label="ledgerLabel(r)"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    class="font-mono"
                  />
                  <UBadge
                    v-if="r.id === lastRoomId"
                    label="Last used"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </div>

              <UButton
                label="Open room"
                trailing-icon="i-lucide-chevron-right"
                :color="r.id === lastRoomId ? 'primary' : 'neutral'"
                :variant="r.id === lastRoomId ? 'solid' : 'soft'"
                class="w-full justify-center"
                :to="`/rooms/${r.id}/dashboard`"
                @click="openRoom(r.id)"
              />
            </UCard>

            <UCard variant="outline" :ui="{ root: 'h-full', body: 'flex h-full flex-col gap-4' }">
              <div
                class="flex size-10 items-center justify-center rounded-lg bg-elevated text-toned"
              >
                <UIcon name="i-lucide-plus" class="size-5" />
              </div>

              <div>
                <p class="font-semibold text-highlighted">Create a new room</p>
                <p class="mt-1 text-sm text-muted">
                  Start a shared ledger for a new apartment or house.
                </p>
              </div>

              <UButton
                label="Create room"
                icon="i-lucide-plus"
                color="neutral"
                variant="outline"
                class="mt-auto w-full justify-center"
                @click="createOpen = true"
              />
            </UCard>
          </div>
        </template>
      </div>
    </template>

    <CreateRoomForm v-model:open="createOpen" />
    <JoinRoomModal v-model:open="joinOpen" />
  </UContainer>
</template>
