<script setup lang="ts">
import { z } from "zod";

definePageMeta({
  auth: { only: "user" },
});

useHead({ title: "Create room · Tricker" });

const { user } = useUserSession();

const schema = z.object({
  name: z.string().min(1, "Give your room a name").max(80, "Keep it under 80 characters"),
  currencies: z.array(z.string()).min(1, "Pick at least one currency"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  currencies: ["USD", "KHR"],
});

const shareLink = ref<string | null>(null);

const steps = [
  { slot: "name", title: "Name", description: "Name your room", icon: "i-lucide-house" },
  { slot: "currencies", title: "Currencies", description: "USD / KHR", icon: "i-lucide-coins" },
  { slot: "review", title: "Review", description: "Create your room", icon: "i-lucide-check" },
  {
    slot: "invite",
    title: "Invite",
    description: "Bring in housemates",
    icon: "i-lucide-user-plus",
  },
];

const currentStep = ref(0);
const form = useTemplateRef("form");
const submitting = ref(false);
const roomId = ref<string | null>(null);

const roomCreated = computed(() => roomId.value !== null);
const lastStep = computed(() => currentStep.value === steps.length - 1);

const toast = useToast();

const stepFields: (keyof Schema)[][] = [["name"], ["currencies"], [], []];

async function goNext() {
  if (currentStep.value === 2) {
    if (submitting.value) return;
    if (roomCreated.value) {
      currentStep.value = 3;
      return;
    }
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
      roomId.value = res.data.room!.id;
      currentStep.value = 3;
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : "Could not create this room.",
        color: "error",
        icon: "i-lucide-alert-circle",
      });
    } finally {
      submitting.value = false;
    }
    return;
  }
  await form.value?.validate({ name: stepFields[currentStep.value] });
  if (currentStep.value < steps.length - 1) currentStep.value += 1;
}

async function createInviteLink() {
  try {
    const res = await $fetch(`/api/rooms/${user.value?.roomId}/invite-links/create`, {
      method: "POST",
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    shareLink.value = res.data.joinUrl;
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create invite link.",
    });
  }
}

const { copy, copied } = useClipboard();
</script>

<template>
  <UContainer class="py-6 max-w-2xl">
    <header class="mb-6">
      <p class="text-xs font-semibold uppercase tracking-wide text-toned mb-2">Onboarding</p>
      <h1 class="text-lg font-semibold text-default">Set up your room</h1>
    </header>

    <UTheme
      :props="{
        input: {
          size: 'lg',
          ui: {
            root: 'w-full',
            base: 'w-full',
          },
        },
        select: {
          size: 'lg',
          ui: {
            base: 'w-full',
          },
        },
      }"
    >
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        @submit="async () => await navigateTo('/dashboard')"
      >
        <UStepper v-model="currentStep" :items="steps" disabled size="sm" class="mb-6">
          <template #name>
            <UCard>
              <h2 class="text-2xl font-semibold text-default mb-1">
                Welcome, {{ user?.name ?? "there" }}
              </h2>
              <p class="text-sm text-toned mb-6">Let's set up your room.</p>
              <UFormField label="What do you call your home?" name="name" required>
                <UInput v-model="state.name" size="lg" autofocus />
              </UFormField>
            </UCard>
          </template>

          <template #currencies>
            <UCard>
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
            <UCard>
              <h2 class="text-lg font-semibold text-default mb-4">Review your room</h2>
              <dl class="space-y-2 mb-2">
                <div class="flex justify-between">
                  <dt class="text-toned">Name</dt>
                  <dd class="font-medium">{{ state.name }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-toned">Currencies</dt>
                  <dd class="font-medium">{{ state.currencies.join(", ") || "—" }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-toned">Categories</dt>
                  <dd class="font-medium text-sm">
                    Rent · Utilities · Food · Supplies (auto-seeded)
                  </dd>
                </div>
              </dl>
            </UCard>
          </template>

          <template #invite>
            <UCard>
              <div class="flex items-start gap-3 mb-5">
                <UIcon name="i-lucide-user-plus" class="size-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h2 class="text-lg font-semibold text-default">Invite your housemates</h2>
                  <p class="text-sm text-toned">You can do this later.</p>
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <h3 class="text-sm font-semibold text-default">Copy a share link</h3>
                  <p class="text-xs text-toned">
                    Send via WhatsApp, Telegram, or any chat. Anyone with the link can join.
                  </p>
                </div>

                <UButton
                  v-if="!shareLink"
                  variant="outline"
                  icon="i-lucide-link"
                  label="Generate link"
                  :loading="submitting"
                  @click="createInviteLink"
                />
                <div v-else class="space-y-1.5">
                  <UFieldGroup size="sm" class="w-full">
                    <UInput :model-value="shareLink" readonly />

                    <UButton
                      :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                      :color="copied ? 'success' : 'neutral'"
                      :aria-label="copied ? 'Copied' : 'Copy link'"
                      variant="outline"
                      @click="
                        () => {
                          if (shareLink) copy(shareLink);
                        }
                      "
                    />
                  </UFieldGroup>
                </div>
              </div>
            </UCard>
          </template>
        </UStepper>

        <div class="flex justify-between">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="currentStep === 0 || roomCreated || submitting"
            @click="
              () => {
                if (!roomCreated && currentStep > 0) currentStep = currentStep - 1;
              }
            "
          >
            Back
          </UButton>

          <UButton
            :label="
              currentStep === 2
                ? roomCreated
                  ? 'Continue'
                  : 'Create room'
                : lastStep
                  ? 'Finish'
                  : 'Continue'
            "
            :type="lastStep ? 'submit' : 'button'"
            :loading="submitting"
            :disabled="submitting"
            :trailing-icon="
              lastStep
                ? undefined
                : currentStep === 2 && !roomCreated
                  ? undefined
                  : 'i-lucide-arrow-right'
            "
            @click="
              () => {
                if (!lastStep) goNext();
              }
            "
          />
        </div>
      </UForm>
    </UTheme>
  </UContainer>
</template>
