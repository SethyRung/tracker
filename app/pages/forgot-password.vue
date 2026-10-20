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

const fieldUi = {
  label: "font-mono text-xs font-semibold tracking-wider text-toned uppercase",
};

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  if (inCooldown.value) return;

  isSubmitting.value = true;
  authError.value = null;

  try {
    const client = useAuthClient();
    if (!client) {
      authError.value = {
        title: "Could not send reset link",
        description: "Try again in a moment.",
      };
      return;
    }

    await client.requestPasswordReset({
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
    if (!client) {
      authError.value = {
        title: "Could not send reset link",
        description: "Try again in a moment.",
      };
      return;
    }

    await client.requestPasswordReset({
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
  <div class="space-y-4">
    <div class="flex items-center justify-between px-0.5">
      <UBadge color="primary" variant="subtle" size="sm" class="font-mono tracking-wider uppercase">
        <span class="size-1.5 rounded-full bg-primary" />
        Account recovery
      </UBadge>
    </div>

    <section class="space-y-6 rounded-2xl border border-default bg-default p-5 shadow-xl sm:p-8">
      <div class="flex items-start gap-3.5">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"
        >
          <UIcon name="i-lucide-key-round" class="size-5" />
        </span>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-highlighted sm:text-[26px]">
            Reset your password
          </h1>
          <p class="mt-1 text-sm text-muted">
            Enter your account email. We'll send a link to choose a new password.
          </p>
        </div>
      </div>

      <UAlert
        v-if="authError"
        icon="i-lucide-alert-circle"
        :title="authError.title"
        :description="authError.description"
        color="error"
        variant="subtle"
      />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="email" label="Account email" required :ui="fieldUi">
          <template #hint>
            <UBadge
              label="Better Auth"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-mono"
            />
          </template>
          <UInput
            v-model="state.email"
            type="email"
            icon="i-lucide-mail"
            placeholder="name@household.com"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="email"
            class="w-full"
            :ui="{ base: 'bg-muted font-mono' }"
          />
        </UFormField>

        <UButton
          type="submit"
          size="lg"
          block
          class="font-bold"
          :loading="isSubmitting"
          :disabled="inCooldown"
        >
          Send reset link
          <UIcon name="i-lucide-arrow-right" class="size-4" />
        </UButton>

        <p
          class="flex items-center justify-center gap-1.5 text-center font-mono text-[11px] text-dimmed"
        >
          <UIcon name="i-lucide-timer" class="size-3.5" />
          60-second cooldown between requests
        </p>
      </UForm>

      <div class="flex justify-center border-t border-default pt-2">
        <NuxtLink to="/sign-in" class="text-xs font-semibold text-primary hover:underline">
          ← Back to sign in
        </NuxtLink>
      </div>
    </section>

    <section
      v-if="submitted"
      class="space-y-3 rounded-xl border border-default bg-default p-4 shadow-sm"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full bg-success" />
          <span class="text-xs font-semibold text-highlighted">Reset link sent</span>
        </div>
      </div>
      <p class="text-xs leading-relaxed text-muted">
        Check the inbox for
        <span class="rounded bg-muted px-1 py-0.5 font-mono font-medium text-highlighted">
          {{ submittedEmail }}
        </span>
        . The link expires after you use it.
      </p>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <UButton
          :label="inCooldown ? `Resend email (${secondsLeft}s)` : 'Resend email'"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="inCooldown"
          :loading="isSubmitting"
          @click="resendLink"
        />
        <UButton
          label="Try another email"
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="inCooldown"
          @click="tryAnother"
        />
      </div>
    </section>
  </div>
</template>
