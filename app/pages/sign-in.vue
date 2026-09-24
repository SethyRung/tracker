<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/" },
});

useHead({
  title: "Sign In · Tricker",
  meta: [
    {
      name: "description",
      content: "Sign in to your Tricker account to manage your household ledgers.",
    },
  ],
});

const toast = useToast();
const signIn = useSignIn("email");

const showPassword = ref(false);

const authError = computed(() => humaniseAuthError(signIn.error.value));
const isSubmitting = computed(() => signIn.status.value === "pending");

const schema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  email: "",
  password: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  await signIn.execute({
    email: data.email,
    password: data.password,
  });

  if (signIn.error.value) return;

  toast.add({
    title: "Welcome back",
    color: "success",
  });
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-center text-2xl font-semibold tracking-tight text-highlighted">Sign In</h1>

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

      <UFormField name="password" label="Password">
        <template #hint>
          <NuxtLink
            to="/forgot-password"
            class="text-xs text-muted transition-colors hover:text-primary"
          >
            Forgot password?
          </NuxtLink>
        </template>

        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Enter your password"
          size="lg"
          autocomplete="current-password"
          class="w-full"
          :ui="{ trailing: 'pr-1.5' }"
        >
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
      Don't have an account?

      <NuxtLink
        to="/sign-up"
        class="font-medium text-highlighted underline underline-offset-2 transition-colors hover:text-primary"
      >
        Sign up
      </NuxtLink>
    </p>
  </div>
</template>
