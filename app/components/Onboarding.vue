<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

const { user } = useUserSession();

const firstName = computed(() => user.value?.name?.trim().split(/\s+/)[0] || "there");

const createOpen = ref(false);

const schema = z.object({
  inviteInput: z.string().trim().min(1, "Paste your invite code or link"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({ inviteInput: "" });
const joinError = ref("");

const features = [
  {
    icon: "i-lucide-arrow-left-right",
    title: "Dual Ledgers",
    description:
      "USD and KHR stay strictly separate with zero exchange rate confusion or forced conversion.",
  },
  {
    icon: "i-lucide-pie-chart",
    title: "Custom Splits",
    description:
      "Split rent, wifi, or dinners equally or by exact percentage weights and attendees.",
  },
  {
    icon: "i-lucide-receipt",
    title: "Month Settlement",
    description:
      "Single-tap net transfer calculations so roommates settle debts with minimal transactions.",
  },
];

async function onJoin(event: FormSubmitEvent<Schema>) {
  const token = extractInviteToken(event.data.inviteInput);
  if (!token) {
    joinError.value = "Paste your invite code or link.";
    return;
  }

  joinError.value = "";
  await navigateTo(`/join/${encodeURIComponent(token)}`);
}
</script>

<template>
  <div class="space-y-8">
    <div class="max-w-2xl space-y-3">
      <UBadge color="success" variant="subtle" size="sm" class="font-mono tracking-wider uppercase">
        <span class="size-1.5 rounded-full bg-success" />
        Account active
      </UBadge>
      <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-4xl">
        Welcome to Tricker, {{ firstName }}
        <UIcon
          name="i-lucide-hand"
          class="inline-block size-6 align-middle text-primary sm:size-8"
        />
      </h1>
      <p class="text-sm text-muted sm:text-base">
        You don't have any household rooms yet. To start tracking shared bills and splitting
        expenses, create a home or join an existing one.
      </p>
    </div>

    <div class="grid items-stretch gap-4 lg:grid-cols-2">
      <section
        class="flex flex-col rounded-2xl border border-primary/40 bg-default p-5 shadow-sm sm:p-6 dark:border-default"
      >
        <div class="flex items-start justify-between gap-3">
          <span
            class="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"
          >
            <UIcon name="i-lucide-house-plus" class="size-5" />
          </span>
          <UBadge
            label="Recommended"
            color="primary"
            variant="subtle"
            size="sm"
            class="font-mono"
          />
        </div>
        <h2 class="mt-4 text-base font-bold text-highlighted">Create a new household</h2>
        <p class="mt-1 text-sm text-muted">
          Set up an apartment or house ledger with parallel USD and KHR currencies, automated bill
          categories, and invite your roommates.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-default px-2.5 py-1 font-mono text-[11px] text-toned"
          >
            <UIcon name="i-lucide-arrow-left-right" class="size-3.5" />
            USD + KHR ledgers
          </span>
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-default px-2.5 py-1 font-mono text-[11px] text-toned"
          >
            <UIcon name="i-lucide-tags" class="size-3.5" />
            Auto categories
          </span>
        </div>
        <UButton size="lg" block class="mt-5 font-bold" @click="createOpen = true">
          Create room
          <UIcon name="i-lucide-arrow-right" class="size-4" />
        </UButton>
      </section>

      <section
        class="flex flex-col rounded-2xl border border-default bg-default p-5 shadow-sm sm:p-6"
      >
        <div class="flex items-start justify-between gap-3">
          <span
            class="flex size-10 items-center justify-center rounded-xl border border-default bg-elevated text-toned"
          >
            <UIcon name="i-lucide-users" class="size-5" />
          </span>
          <UBadge
            label="Invite code"
            color="neutral"
            variant="outline"
            size="sm"
            class="font-mono"
          />
        </div>
        <h2 class="mt-4 text-base font-bold text-highlighted">Join an existing room</h2>
        <p class="mt-1 text-sm text-muted">
          Did your housemate already create a room? Paste their invite link or code to join.
        </p>

        <UForm :schema="schema" :state="state" class="mt-auto space-y-3 pt-5" @submit="onJoin">
          <UFormField
            name="inviteInput"
            label="Invite code or link"
            required
            :ui="{ label: 'sr-only' }"
          >
            <div class="flex gap-2">
              <UInput
                v-model="state.inviteInput"
                icon="i-lucide-ticket"
                placeholder="Code or link"
                size="lg"
                color="neutral"
                variant="outline"
                autocomplete="off"
                class="min-w-0 flex-1"
                :ui="{ base: 'bg-muted font-mono' }"
              />
              <UButton
                type="submit"
                label="Continue"
                trailing-icon="i-lucide-arrow-right"
                color="neutral"
                variant="solid"
                size="lg"
                class="shrink-0 font-semibold"
              />
            </div>
          </UFormField>
          <UAlert
            v-if="joinError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-x"
            :title="joinError"
          />
        </UForm>
      </section>
    </div>

    <section class="space-y-3">
      <p
        class="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-dimmed uppercase"
      >
        <UIcon name="i-lucide-info" class="size-3.5" />
        How it works
      </p>
      <div class="grid gap-3 md:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="rounded-2xl border border-default bg-default p-4"
        >
          <UIcon :name="feature.icon" class="size-4 text-toned" />
          <h3 class="mt-2 text-sm font-bold text-highlighted">{{ feature.title }}</h3>
          <p class="mt-1 text-xs leading-relaxed text-muted">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <p class="pt-2 text-center text-xs text-dimmed">
      Signed in as
      <span class="font-mono text-muted">{{ user?.email }}</span>
    </p>

    <CreateRoomForm v-model:open="createOpen" />
  </div>
</template>
