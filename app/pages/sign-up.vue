<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/" },
});

useHead({
  title: "Sign Up · Tricker",
  meta: [
    {
      name: "description",
      content:
        "Create a Tricker account to start tracking shared bills and dual-currency household ledgers.",
    },
  ],
});

const toast = useToast();
const signUp = useSignUp("email");

const showPassword = ref(false);

const authError = computed(() => humaniseAuthError(signUp.error.value));
const isSubmitting = computed(() => signUp.status.value === "pending");

const schema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms to continue",
  }),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  terms: false,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  const fullName =
    `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || data.email.split("@")[0] || "User";

  await signUp.execute({
    email: data.email,
    password: data.password,
    name: fullName,
  });

  if (signUp.error.value) return;

  toast.add({
    title: "Welcome to Tricker",
    description: "Account created successfully.",
    color: "success",
  });
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-center text-2xl font-semibold tracking-tight text-highlighted">Sign Up</h1>

    <UAlert
      v-if="authError"
      icon="i-lucide-alert-circle"
      :title="authError.title"
      color="error"
      variant="subtle"
    />

    <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
      <div class="grid grid-cols-2 gap-3">
        <UFormField name="firstName" label="First name" hint="Optional">
          <UInput
            v-model="state.firstName"
            placeholder="First name"
            size="lg"
            autocomplete="given-name"
            class="w-full"
          />
        </UFormField>

        <UFormField name="lastName" label="Last name" hint="Optional">
          <UInput
            v-model="state.lastName"
            placeholder="Last name"
            size="lg"
            autocomplete="family-name"
            class="w-full"
          />
        </UFormField>
      </div>

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
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Create a password"
          size="lg"
          autocomplete="new-password"
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

      <UFormField name="terms">
        <div class="flex items-start gap-2.5 pt-1">
          <UCheckbox v-model="state.terms" class="mt-0.5" />
          <span class="text-xs leading-relaxed text-muted">
            I agree to the
            <span class="hover:text-primary-hover text-primary underline underline-offset-2">
              Terms of Service
            </span>
            ,
            <span class="hover:text-primary-hover text-primary underline underline-offset-2">
              Privacy Policy
            </span>
            , and
            <span class="hover:text-primary-hover text-primary underline underline-offset-2">
              Household Rules
            </span>
            .
          </span>
        </div>
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
      Already have an account?

      <NuxtLink
        to="/sign-in"
        class="font-medium text-highlighted underline underline-offset-2 transition-colors hover:text-primary"
      >
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
