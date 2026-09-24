<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/" },
});

useHead({
  title: "Reset Password · Tricker",
  meta: [
    {
      name: "description",
      content: "Reset your Tricker account password securely.",
    },
  ],
});

const COOLDOWN_SECONDS = 60;

const submitted = ref(false);
const submittedEmail = ref("");
const authError = ref<ReturnType<typeof humaniseAuthError>>(null);
const isSubmitting = ref(false);
const secondsLeft = ref(0);

let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const inCooldown = computed(() => secondsLeft.value > 0);

const schema = z.object({
  email: z.email("Please enter a valid email address"),
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
    submittedEmail.value = data.email;
    submitted.value = true;
    startCooldown();
  } catch (error) {
    authError.value = humaniseAuthError(error as { code?: string; message?: string });
  } finally {
    isSubmitting.value = false;
  }
}

async function resendLink() {
  if (inCooldown.value || !submittedEmail.value) return;

  isSubmitting.value = true;
  authError.value = null;

  try {
    const client = useAuthClient();
    await client?.requestPasswordReset({
      email: submittedEmail.value,
      redirectTo: "/reset-password",
    });
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
  submittedEmail.value = "";
  state.email = "";
  authError.value = null;
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>

<template>
  <div class="space-y-6">
    <template v-if="submitted">
      <h1 class="text-center text-2xl font-semibold tracking-tight text-highlighted">
        Check Your Email
      </h1>

      <p class="text-center text-sm text-muted">
        We sent a reset link to
        <span class="font-medium text-highlighted">{{ submittedEmail }}</span
        >.
      </p>

      <UAlert
        v-if="authError"
        icon="i-lucide-alert-circle"
        :title="authError.title"
        color="error"
        variant="subtle"
      />

      <div class="space-y-3 pt-2">
        <UButton
          :label="inCooldown ? `Resend in ${secondsLeft}s` : 'Resend email'"
          color="neutral"
          variant="outline"
          size="lg"
          block
          :disabled="inCooldown"
          :loading="isSubmitting"
          @click="resendLink"
        />

        <UButton
          label="Try another email"
          variant="ghost"
          color="neutral"
          size="sm"
          block
          :disabled="inCooldown"
          @click="tryAnother"
        />
      </div>

      <p class="text-center text-sm text-muted">
        <NuxtLink
          to="/sign-in"
          class="font-medium text-highlighted underline underline-offset-2 transition-colors hover:text-primary"
        >
          Back to sign in
        </NuxtLink>
      </p>
    </template>

    <template v-else>
      <h1 class="text-center text-2xl font-semibold tracking-tight text-highlighted">
        Reset Password
      </h1>

      <UAlert
        v-if="authError"
        icon="i-lucide-alert-circle"
        :title="authError.title"
        color="error"
        variant="subtle"
      />

      <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
        <UFormField name="email" label="Email address">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="Enter your email address"
            size="lg"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <div class="pt-2">
          <UButton
            type="submit"
            label="Continue"
            size="lg"
            block
            :loading="isSubmitting"
            class="font-bold"
          />
        </div>
      </UForm>

      <p class="text-center text-sm text-muted">
        Remember your password?

        <NuxtLink
          to="/sign-in"
          class="font-medium text-highlighted underline underline-offset-2 transition-colors hover:text-primary"
        >
          Sign in
        </NuxtLink>
      </p>
    </template>
  </div>
</template>
