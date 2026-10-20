<script setup lang="ts">
import * as z from "zod";

const open = defineModel<boolean>("open", { default: false });

const { user, fetchSession } = useUserSession();
const { refresh } = useRoomMemberships();
const lastRoomId = useLastRoomId();
const toast = useToast();

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

const roomCreated = computed(() => roomId.value !== null);

const { isMD } = useBreakpoints();
const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");
const OverlayComponent = computed(() => ({
  is: isMD.value ? UModal : UDrawer,
  props: isMD.value
    ? { scrollable: true, ui: { content: "max-w-2xl" } }
    : {
        handleOnly: true,
        fixed: true,
      },
}));

const seededCategories = ["Rent", "Utilities", "Food", "Supplies"];

const currencyItems = [
  {
    label: "USD",
    description: "US Dollar. Rent and utilities.",
    value: "USD",
  },
  {
    label: "KHR",
    description: "Cambodian Riel. Markets, food, and local bills.",
    value: "KHR",
  },
];

const overlayTitle = "Create a household";

const overlayDescription = computed(() => {
  switch (currentStep.value) {
    case "name":
      return "What do you call your home?";
    case "currencies":
      return "USD and KHR stay as parallel ledgers. No conversion.";
    case "review":
      return "Check these details, then create the room.";
    case "invite":
      return "Invite housemates now, or skip and do it later.";
    default:
      return "";
  }
});

const continueLabel = computed(() => {
  if (currentStep.value === "currencies") return "Continue to review";
  if (currentStep.value === "review") return "Create room";
  if (currentStep.value === "invite") return "Go to room";
  return "Continue";
});

const stepFields: Partial<Record<StepValue, (keyof Schema)[]>> = {
  name: ["name"],
  currencies: ["currencies"],
};

function reset() {
  state.name = "";
  state.currencies = ["USD", "KHR"];
  currentStep.value = "name";
  roomId.value = null;
  inviteOpen.value = false;
  submitting.value = false;
}

watch(open, (isOpen) => {
  if (isOpen) reset();
});

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
    lastRoomId.value = roomId.value;
    await Promise.all([fetchSession({ force: true }), refresh()]);
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

async function goToRoom() {
  const id = roomId.value;
  if (!id) return;
  lastRoomId.value = id;
  await navigateTo(`/rooms/${id}/dashboard`);
}

async function goNext() {
  if (currentStep.value === "review") {
    if (await createRoom()) stepper.value?.next();
    return;
  }

  const fields = stepFields[currentStep.value];
  if (fields?.length) {
    const ok = await form.value?.validate({ name: fields, silent: true });
    if (!ok) return;
  }

  if (stepper.value?.hasNext) stepper.value.next();
  else await goToRoom();
}
</script>

<template>
  <component
    :is="OverlayComponent.is"
    v-model:open="open"
    :title="overlayTitle"
    :description="overlayDescription"
    v-bind="OverlayComponent.props"
  >
    <slot />

    <template #body>
      <UForm ref="form" :schema="schema" :state="state">
        <UStepper ref="stepper" v-model="currentStep" :items="steps" disabled size="sm">
          <template #name>
            <div class="space-y-4">
              <p class="text-sm text-muted">Welcome, {{ user?.name ?? "there" }}.</p>
              <UFormField label="What do you call your home?" name="name" required>
                <UInput
                  v-model="state.name"
                  size="lg"
                  placeholder="Apartment 4B"
                  autofocus
                  :ui="{ root: 'w-full' }"
                />
              </UFormField>
            </div>
          </template>

          <template #currencies>
            <div class="space-y-5">
              <div class="space-y-1.5">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-medium text-default">What do you call your home?</p>
                  <UBadge
                    v-if="state.name.trim()"
                    icon="i-lucide-check"
                    label="Saved"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  />
                </div>
                <UInput :model-value="state.name" size="lg" disabled :ui="{ root: 'w-full' }" />
              </div>

              <UFormField label="Active currencies" name="currencies" required>
                <UCheckboxGroup v-model="state.currencies" :items="currencyItems" variant="card" />
              </UFormField>

              <UCard variant="subtle">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold text-highlighted">Auto-seeded categories</p>
                  <UBadge label="Default" color="neutral" variant="subtle" size="sm" />
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="name in seededCategories"
                    :key="name"
                    :label="name"
                    color="neutral"
                    variant="outline"
                  />
                </div>
              </UCard>
            </div>
          </template>

          <template #review>
            <UCard variant="subtle" :ui="{ body: 'divide-y divide-default p-0 sm:p-0' }">
              <div class="flex items-center justify-between gap-3 px-4 py-3">
                <span class="text-sm text-muted">Name</span>
                <span class="text-right text-sm font-medium text-highlighted">
                  {{ state.name || "—" }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3 px-4 py-3">
                <span class="text-sm text-muted">Currencies</span>
                <div v-if="state.currencies.length" class="flex flex-wrap justify-end gap-1.5">
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
              </div>
              <div class="flex items-start justify-between gap-3 px-4 py-3">
                <span class="text-sm text-muted">Categories</span>
                <span class="text-right text-sm text-toned">
                  {{ seededCategories.join(" · ") }}
                </span>
              </div>
            </UCard>
          </template>

          <template #invite>
            <div class="space-y-4">
              <p class="text-sm text-muted">
                Share an invite link now, or skip and send it from the room later.
              </p>
              <UButton
                icon="i-lucide-user-plus"
                label="Invite members"
                color="neutral"
                variant="outline"
                :disabled="!roomId"
                @click="inviteOpen = true"
              />
            </div>
          </template>
        </UStepper>
      </UForm>
    </template>

    <template #footer>
      <div
        class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <UButton
          v-if="stepper?.hasPrev"
          icon="i-lucide-arrow-left"
          label="Back"
          color="neutral"
          variant="ghost"
          :disabled="roomCreated || submitting"
          @click="stepper?.prev()"
        />

        <UButton
          :label="continueLabel"
          trailing-icon="i-lucide-arrow-right"
          :loading="submitting"
          class="justify-center sm:ml-auto sm:w-auto"
          @click="goNext"
        />
      </div>
    </template>
  </component>

  <MembersInviteModal v-if="roomId" v-model:open="inviteOpen" :room-id="roomId" />
</template>
