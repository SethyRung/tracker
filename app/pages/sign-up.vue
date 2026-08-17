<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/dashboard" },
});

useHead({
  title: "Sign up · Tricker",
  meta: [
    {
      name: "description",
      content: "Create a Tricker account to start tracking shared bills with your household.",
    },
  ],
});

const toast = useToast();
const signUp = useSignUp("email");

const showPassword = ref(false);
const showConfirmPassword = ref(false);

const authError = computed(() => humaniseAuthError(signUp.error.value));
const isSubmitting = computed(() => signUp.status.value === "pending");

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  await signUp.execute({
    email: data.email,
    password: data.password,
    name: data.name,
  });
  if (signUp.error.value) return;
  toast.add({
    title: "Welcome to Tricker",
    description: "Check your inbox to verify your email.",
    color: "success",
  });
}
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">Create your account</h1>
      <p class="mt-2 text-base text-muted">Start tracking shared bills in under a minute.</p>
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
      <UFormField name="name" label="Name">
        <UInput v-model="state.name" placeholder="Your name" size="lg" autocomplete="name">
          <template #leading>
            <UIcon name="i-lucide-user" class="size-4 text-muted" />
          </template>
        </UInput>
      </UFormField>

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

      <UFormField name="password" label="Password">
        <template #hint>
          <span class="text-sm text-toned">At least 8 characters</span>
        </template>
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="••••••••"
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

      <UFormField name="confirmPassword" label="Confirm password">
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

      <UButton type="submit" label="Sign up" size="lg" block :loading="isSubmitting" />
    </UForm>

    <p class="mt-8 text-sm text-muted text-center">
      Already have an account?
      <NuxtLink to="/sign-in" class="text-primary font-medium hover:underline underline-offset-2">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
