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
  password: z.string("Password is required").min(8, "Password must be at least 8 characters"),
  remember: z.boolean("Choose whether to stay signed in"),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  email: "",
  password: "",
  remember: true,
});

const fieldUi = {
  label: "font-mono text-[11px] font-semibold tracking-wider text-toned uppercase",
};

const inputUi = {
  base: "bg-muted font-mono",
};

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  await signIn.execute({
    email: data.email,
    password: data.password,
    rememberMe: data.remember,
  });

  if (signIn.error.value) return;

  toast.add({
    title: "Welcome back",
    color: "success",
  });
}
</script>

<template>
  <div class="space-y-4">
    <section class="space-y-6 rounded-2xl border border-default bg-default p-5 shadow-xl sm:p-8">
      <div class="space-y-1.5">
        <UBadge
          label="Clearinghouse auth"
          color="neutral"
          variant="subtle"
          size="sm"
          class="font-mono tracking-wider uppercase"
        />
        <h1 class="text-[22px] font-bold tracking-tight text-highlighted sm:text-[26px]">
          Welcome back
        </h1>
        <p class="text-sm text-muted">
          Sign in to access your parallel USD and KHR household ledgers.
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

        <UFormField name="password" label="Password" required :ui="fieldUi">
          <template #hint>
            <NuxtLink
              to="/forgot-password"
              class="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </NuxtLink>
          </template>

          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Enter your password"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="current-password"
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

        <UFormField name="remember">
          <UCheckbox
            v-model="state.remember"
            label="Remember this device"
            color="primary"
            :ui="{ label: 'text-sm font-medium text-muted' }"
          />
        </UFormField>

        <UButton type="submit" size="lg" block class="font-bold" :loading="isSubmitting">
          Sign in to Tricker
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
      <span>New to Tricker? Join your roommates</span>
      <NuxtLink to="/sign-up" class="shrink-0 font-semibold text-primary hover:underline">
        Create account
      </NuxtLink>
    </section>
  </div>
</template>
