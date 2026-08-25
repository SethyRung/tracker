<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/" },
});

useHead({
  title: "Reset password · Tricker",
  meta: [
    {
      name: "description",
      content: "Reset your Tricker password.",
    },
  ],
});

const COOLDOWN_SECONDS = 60;

const submitted = ref(false);
const authError = ref<ReturnType<typeof humaniseAuthError>>(null);
const isSubmitting = ref(false);
const secondsLeft = ref(0);

let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const inCooldown = computed(() => secondsLeft.value > 0);

const schema = z.object({
  email: z.email("Invalid email address"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  email: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  if (inCooldown.value) return;

  isSubmitting.value = true;
  authError.value = null;

  try {
    const client = useAuthClient();
    await client?.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });
    submitted.value = true;
    startCooldown();
  } catch (error) {
    authError.value = humaniseAuthError(error as { code?: string; message?: string });
  } finally {
    isSubmitting.value = false;
  }
}

function startCooldown() {
  secondsLeft.value = COOLDOWN_SECONDS;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    secondsLeft.value -= 1;
    if (secondsLeft.value <= 0) {
      clearInterval(cooldownTimer!);
      cooldownTimer = null;
    }
  }, 1000);
}

function tryAnother() {
  if (inCooldown.value) return;
  submitted.value = false;
  state.email = "";
  authError.value = null;
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>

<template>
  <div>
    <template v-if="!submitted">
      <header class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
          Forgot your password?
        </h1>
        <p class="mt-2 text-base text-muted">
          Enter your email and we'll send you a link to choose a new password.
        </p>
      </header>

      <UAlert
        v-if="authError"
        color="error"
        variant="subtle"
        :title="authError.title"
        :description="authError.description"
        icon="i-lucide-alert-circle"
        class="mb-6"
      />

      <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <UFormField name="email" label="Email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="you@example.com"
            size="lg"
            autocomplete="email"
          >
            <template #leading>
              <UIcon name="i-lucide-mail" class="size-4 text-muted" />
            </template>
          </UInput>
        </UFormField>

        <UButton
          type="submit"
          :label="inCooldown ? `Wait ${secondsLeft}s` : 'Send reset link'"
          size="lg"
          block
          :loading="isSubmitting"
          :disabled="inCooldown"
        />
      </UForm>
    </template>

    <div v-else class="text-center py-4">
      <div
        class="mx-auto size-16 rounded-full bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center mb-6"
      >
        <UIcon name="i-lucide-mail-check" class="size-8 text-primary" />
      </div>
      <h2 class="text-2xl font-semibold tracking-tight text-highlighted">Check your inbox</h2>
      <p class="mt-3 text-base text-muted leading-relaxed">
        We sent a reset link to
        <span class="font-medium text-default break-all">{{ state.email }}</span
        >. The link expires in 1 hour.
      </p>
      <UButton
        :label="inCooldown ? `Resend in ${secondsLeft}s` : 'Try another email'"
        color="neutral"
        variant="ghost"
        size="md"
        class="mt-8"
        :disabled="inCooldown"
        @click="tryAnother"
      />
    </div>

    <p class="mt-10 text-sm text-muted text-center">
      <NuxtLink
        to="/sign-in"
        class="inline-flex items-center gap-1.5 text-default hover:text-primary transition-colors"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Back to sign in
      </NuxtLink>
    </p>
  </div>
</template>
