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
    ? { scrollable: true, ui: { footer: "justify-end" } }
    : {
        handleOnly: true,
        fixed: true,
        ui: { footer: "flex-col-reverse" },
      },
}));

const overlayTitle = computed(() =>
  currentStep.value === "invite" ? "Invite housemates" : "Create a room",
);

const overlayDescription = computed(() => {
  switch (currentStep.value) {
    case "name":
      return "What do you call your home?";
    case "currencies":
      return "USD and KHR stay as parallel ledgers — no conversion.";
    case "review":
      return "Check these details, then create the room.";
    case "invite":
      return "You can do this later.";
    default:
      return "";
  }
});

const continueLabel = computed(() => {
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
              <p class="text-sm text-toned">Welcome, {{ user?.name ?? "there" }}.</p>
              <UFormField label="Room name" name="name" required>
                <UInput v-model="state.name" size="lg" :ui="{ root: 'w-full' }" autofocus />
              </UFormField>
            </div>
          </template>

          <template #currencies>
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
          </template>

          <template #review>
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
          </template>

          <template #invite>
            <div class="space-y-4">
              <p class="text-sm text-toned">Invite now or skip and do it from the room later.</p>
              <UButton
                icon="i-lucide-user-plus"
                label="Invite members"
                :disabled="!roomId"
                @click="inviteOpen = true"
              />
            </div>
          </template>
        </UStepper>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton
        v-if="isMD && !roomCreated"
        label="Cancel"
        color="neutral"
        variant="ghost"
        :block="!isMD"
        :disabled="submitting"
        @click="close"
      />

      <UButton
        v-if="stepper?.hasPrev"
        :icon="isMD ? 'i-lucide-arrow-left' : ''"
        label="Back"
        color="neutral"
        variant="outline"
        :block="!isMD"
        :disabled="roomCreated || submitting"
        @click="stepper?.prev()"
      />

      <UButton
        :label="continueLabel"
        size="lg"
        :block="!isMD"
        :loading="submitting"
        :trailing-icon="isMD ? 'i-lucide-arrow-right' : ''"
        @click="goNext"
      />
    </template>
  </component>

  <MembersInviteModal v-if="roomId" v-model:open="inviteOpen" :room-id="roomId" />
</template>
