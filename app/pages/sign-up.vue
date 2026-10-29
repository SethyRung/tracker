<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { normalizePhone } from "#shared/utils/contact";
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
  firstName: z.string("First name is required").trim().min(1, "First name is required"),
  lastName: z.string("Last name is required").trim().min(1, "Last name is required"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().refine((value) => !!normalizePhone(value), "Use an international phone number"),
  password: z.string("Password is required").min(8, "Password must be at least 8 characters"),
  terms: z.boolean("You must agree to the terms to continue").refine((val) => val === true, {
    message: "You must agree to the terms to continue",
  }),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  terms: false,
});

const fieldUi = {
  label: "font-mono text-xs font-semibold tracking-wider text-toned uppercase",
};

const inputUi = {
  base: "bg-muted font-mono",
};

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  const fullName = `${data.firstName} ${data.lastName}`;

  await signUp.execute({
    email: data.email,
    password: data.password,
    name: fullName,
    phone: normalizePhone(data.phone)!,
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
  <div class="space-y-4">
    <section class="space-y-6 rounded-2xl border border-default bg-default p-5 shadow-xl sm:p-8">
      <div class="space-y-1.5">
        <UBadge
          label="New household account"
          color="neutral"
          variant="subtle"
          size="sm"
          class="font-mono tracking-wider uppercase"
        />
        <h1 class="text-[22px] font-bold tracking-tight text-highlighted sm:text-[26px]">
          Create your account
        </h1>
        <p class="text-sm text-muted">
          Start a Tricker account for shared USD and KHR household bills.
        </p>
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
        <div class="grid grid-cols-2 gap-3">
          <UFormField name="firstName" label="First name" required :ui="fieldUi">
            <UInput
              v-model="state.firstName"
              placeholder="First name"
              size="lg"
              color="neutral"
              variant="outline"
              autocomplete="given-name"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField name="lastName" label="Last name" required :ui="fieldUi">
            <UInput
              v-model="state.lastName"
              placeholder="Last name"
              size="lg"
              color="neutral"
              variant="outline"
              autocomplete="family-name"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>
        </div>

        <UFormField name="email" label="Email address" required :ui="fieldUi">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="name@household.com"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="email"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField
          name="phone"
          label="Phone number"
          required
          :ui="fieldUi"
          description="Include the country code, for example +855."
        >
          <UInput
            v-model="state.phone"
            type="tel"
            placeholder="+855 12 345 678"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="tel"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <UFormField name="password" label="Password" required :ui="fieldUi">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Create a password"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="new-password"
            class="w-full"
            :ui="{ ...inputUi, trailing: 'pe-1.5' }"
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
          <div class="flex items-start gap-2.5">
            <UCheckbox v-model="state.terms" color="primary" class="mt-0.5" />
            <span class="text-xs leading-relaxed text-muted">
              I agree to the Terms of Service, Privacy Policy, and Household Rules.
            </span>
          </div>
        </UFormField>

        <UButton type="submit" size="lg" block class="font-bold" :loading="isSubmitting">
          Create account
          <UIcon name="i-lucide-arrow-right" class="size-4" />
        </UButton>
      </UForm>

      <div
        class="flex items-center justify-between border-t border-default pt-3 font-mono text-[11px] text-dimmed"
      >
        <span class="flex items-center gap-1.5">
          <span class="size-1.5 rounded-full bg-primary" />
          Separate ledgers
        </span>
        <span>USD · KHR</span>
      </div>
    </section>

    <section
      class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default px-4 py-3.5 text-sm text-muted shadow-sm"
    >
      <span>Already have an account?</span>
      <NuxtLink to="/sign-in" class="shrink-0 font-semibold text-primary hover:underline">
        Sign in
      </NuxtLink>
    </section>
  </div>
</template>
