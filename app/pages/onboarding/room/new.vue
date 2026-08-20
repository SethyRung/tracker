<script setup lang="ts">
import { z } from "zod";

definePageMeta({
  auth: { only: "user" },
  layout: "bare",
});

useHead({ title: "Create room · Tricker" });

const { user, fetchSession } = useUserSession();

const schema = z.object({
  name: z.string().min(1, "Give your room a name").max(80, "Keep it under 80 characters"),
  currencies: z.array(z.string()).min(1, "Pick at least one currency"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  currencies: ["USD", "KHR"],
});

const steps = [
  {
    icon: "i-lucide-house",
    title: "Name",
    description: "Name your room",
    value: "name" as const,
    slot: "name" as const,
  },
  {
    icon: "i-lucide-coins",
    title: "Currencies",
    description: "USD / KHR",
    value: "currencies" as const,
    slot: "currencies" as const,
  },
  {
    icon: "i-lucide-check",
    title: "Review",
    description: "Create your room",
    value: "review" as const,
    slot: "review" as const,
  },
  {
    icon: "i-lucide-user-plus",
    title: "Invite",
    description: "Bring in housemates",
    value: "invite" as const,
    slot: "invite" as const,
  },
];

type StepValue = (typeof steps)[number]["value"];

const currentStep = ref<StepValue>("name");

const stepper = useTemplateRef("stepper");
const form = useTemplateRef("form");

const submitting = ref(false);
const roomId = ref<string | null>(null);
const inviteOpen = ref(false);
const lastRoomId = useLastRoomId();

const roomCreated = computed(() => roomId.value !== null);

const toast = useToast();

const stepFields: Partial<Record<StepValue, (keyof Schema)[]>> = {
  name: ["name"],
  currencies: ["currencies"],
};

async function createRoom() {
  if (submitting.value) return false;
  if (roomCreated.value) return true;
  submitting.value = true;
  try {
    const res = await $fetch("/api/rooms", {
      method: "POST",
      body: {
        name: state.name.trim(),
        usdEnabled: state.currencies.includes("USD"),
        khrEnabled: state.currencies.includes("KHR"),
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    roomId.value = res.data!.id;
    return true;
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create this room.",
    });
    return false;
  } finally {
    submitting.value = false;
  }
}

async function goNext() {
  // Review step creates the room before advancing.
  if (currentStep.value === "review") {
    if (await createRoom()) {
      await fetchSession({ force: true });
      stepper.value?.next();
    }
    return;
  }

  // Validate the current step's fields before advancing.
  const fields = stepFields[currentStep.value];
  if (fields?.length) {
    const ok = await form.value?.validate({ name: fields, silent: true });
    if (!ok) return;
  }

  if (stepper.value?.hasNext) stepper.value?.next();
  else {
    const id = roomId.value;
    if (id) {
      lastRoomId.value = id;
      await navigateTo(`/rooms/${id}/dashboard`);
    } else {
      await navigateTo("/rooms");
    }
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <div class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Onboarding</p>
      <h1 class="font-pixel-circle text-2xl text-primary">Set up your room</h1>
      <p class="text-xs text-toned">Name your household, pick currencies, and invite housemates.</p>
    </div>

    <UForm ref="form" :schema="schema" :state="state">
      <UStepper ref="stepper" v-model="currentStep" :items="steps" disabled size="sm" class="mb-6">
        <template #name>
          <UCard variant="outline">
            <h2 class="text-2xl font-semibold text-default mb-1">
              Welcome, {{ user?.name ?? "there" }}
            </h2>
            <p class="text-sm text-toned mb-6">Let's set up your room.</p>
            <UFormField label="What do you call your home?" name="name" required>
              <UInput v-model="state.name" size="lg" :ui="{ root: 'w-full' }" autofocus />
            </UFormField>
          </UCard>
        </template>

        <template #currencies>
          <UCard variant="outline">
            <h2 class="text-lg font-semibold text-default mb-4">Which currencies do you use?</h2>
            <UFormField name="currencies">
              <UCheckboxGroup
                v-model="state.currencies"
                :items="[
                  { label: 'USD', description: 'American Dollar', value: 'USD' },
                  { label: 'KHR', description: 'Cambodian Riel', value: 'KHR' },
                ]"
                variant="card"
              />
            </UFormField>
          </UCard>
        </template>

        <template #review>
          <UCard variant="outline">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-check" class="size-4 text-toned" />
                <h2 class="font-mono text-xs font-semibold uppercase tracking-wider text-toned">
                  Review your room
                </h2>
              </div>
            </template>

            <ul class="divide-y divide-default">
              <li class="flex items-center justify-between gap-3 py-3">
                <div class="flex items-center gap-2 text-toned">
                  <UIcon name="i-lucide-house" class="size-4" />
                  <span class="text-sm">Name</span>
                </div>
                <span class="text-sm font-medium text-default text-right">
                  {{ state.name || "—" }}
                </span>
              </li>

              <li class="flex items-center justify-between gap-3 py-3">
                <div class="flex items-center gap-2 text-toned">
                  <UIcon name="i-lucide-coins" class="size-4" />
                  <span class="text-sm">Currencies</span>
                </div>
                <div v-if="state.currencies.length" class="flex items-center gap-1.5">
                  <UBadge
                    v-for="c in state.currencies"
                    :key="c"
                    color="neutral"
                    variant="subtle"
                    :label="c"
                    class="font-mono"
                  />
                </div>
                <span v-else class="text-sm text-dimmed">—</span>
              </li>

              <li class="flex items-start justify-between gap-3 py-3">
                <div class="flex items-center gap-2 text-toned">
                  <UIcon name="i-lucide-tags" class="size-4 mt-0.5" />
                  <span class="text-sm">Categories</span>
                </div>
                <span class="text-sm text-toned text-right">
                  Rent · Utilities · Food · Supplies
                  <span class="text-dimmed">(auto-seeded)</span>
                </span>
              </li>
            </ul>
          </UCard>
        </template>

        <template #invite>
          <UCard variant="outline">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-user-plus" class="size-4 text-toned" />
                <h2 class="font-mono text-xs font-semibold uppercase tracking-wider text-toned">
                  Invite your housemates
                </h2>
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-sm text-toned">You can do this later.</p>

              <UButton
                icon="i-lucide-user-plus"
                label="Invite members"
                :disabled="!roomId"
                @click="inviteOpen = true"
              />
            </div>
          </UCard>
        </template>
      </UStepper>

      <div class="flex items-center">
        <UButton
          v-if="stepper?.hasPrev"
          icon="i-lucide-arrow-left"
          label="Back"
          color="neutral"
          variant="outline"
          :disabled="roomCreated || submitting"
          @click="stepper?.prev()"
        />

        <UButton
          label="Continue"
          :loading="submitting"
          trailing-icon="i-lucide-arrow-right"
          class="ml-auto"
          @click="goNext"
        />
      </div>
    </UForm>

    <MembersInviteModal v-if="roomId" v-model:open="inviteOpen" :room-id="roomId" />
  </UContainer>
</template>
