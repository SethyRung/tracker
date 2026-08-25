<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/" },
});

useHead({
  title: "Set new password · Tricker",
  meta: [
    {
      name: "description",
      content: "Choose a new password for your Tricker account.",
    },
  ],
});

const route = useRoute();

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const authError = ref<ReturnType<typeof humaniseAuthError>>(null);
const isSubmitting = ref(false);

const token = computed(() => {
  const raw = route.query.token;
  return typeof raw === "string" ? raw : "";
});

const hasToken = computed(() => token.value.length > 0);

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  password: "",
  confirmPassword: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  if (!token.value) return;

  isSubmitting.value = true;
  authError.value = null;
  try {
    const client = useAuthClient();
    await client?.resetPassword({
      newPassword: data.password,
      token: token.value,
    });
    await navigateTo("/sign-in");
  } catch (error) {
    authError.value = humaniseAuthError(error as { code?: string; message?: string });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div>
    <template v-if="!hasToken">
      <div class="text-center py-4">
        <div
          class="mx-auto size-16 rounded-full bg-error-50 dark:bg-error-950/40 flex items-center justify-center mb-6"
        >
          <UIcon name="i-lucide-alert-circle" class="size-8 text-error" />
        </div>
        <h2 class="text-2xl font-semibold tracking-tight text-highlighted">Link is missing</h2>
        <p class="mt-3 text-base text-muted leading-relaxed">
          This reset link is invalid or has expired. Request a fresh one and we'll send it straight
          to your inbox.
        </p>
        <UButton label="Request a new link" size="lg" to="/forgot-password" class="mt-8" />
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
    </template>

    <template v-else>
      <header class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted">Set a new password</h1>
        <p class="mt-2 text-base text-muted">Pick something strong — at least 8 characters.</p>
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
        <UFormField name="password" label="New password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="At least 8 characters"
            size="lg"
            autocomplete="new-password"
          >
            <template #leading>
              <UIcon name="i-lucide-lock" class="size-4 text-muted" />
            </template>
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField name="confirmPassword" label="Confirm new password">
          <UInput
            v-model="state.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Repeat the password"
            size="lg"
            autocomplete="new-password"
          >
            <template #leading>
              <UIcon name="i-lucide-lock-keyhole" class="size-4 text-muted" />
            </template>
            <template #trailing>
              <UButton
                :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton type="submit" label="Update password" size="lg" block :loading="isSubmitting" />
      </UForm>
    </template>

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
