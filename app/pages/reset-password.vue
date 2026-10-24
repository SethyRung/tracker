<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "auth",
  auth: { only: "guest", redirectTo: "/" },
});

useHead({
  title: "Set New Password · Tricker",
  meta: [
    {
      name: "description",
      content: "Choose a new password for your Tricker household account.",
    },
  ],
});

const route = useRoute();
const toast = useToast();

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const authError = ref<ReturnType<typeof humaniseAuthError>>(null);
const isSubmitting = ref(false);

const token = computed(() => {
  const raw = route.query.token;
  return typeof raw === "string" ? raw : "";
});

const hasToken = computed(() => token.value.trim().length > 0);

const schema = z
  .object({
    password: z.string("Password is required").min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string("Please confirm your password")
      .min(8, "Please confirm your password"),
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

const fieldUi = {
  label: "font-mono text-xs font-semibold tracking-wider text-toned uppercase",
};

const inputUi = {
  base: "bg-muted font-mono",
  trailing: "pe-1.5",
};

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { data } = event;
  if (!token.value) return;

  isSubmitting.value = true;
  authError.value = null;

  try {
    const client = useAuthClient();
    if (!client) {
      authError.value = {
        title: "Could not update password",
        description: "Try again in a moment.",
      };
      return;
    }

    await client.resetPassword({
      newPassword: data.password,
      token: token.value,
    });

    toast.add({
      title: "Password updated",
      color: "success",
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
  <div class="space-y-4">
    <div class="flex items-center justify-between px-0.5">
      <UBadge color="primary" variant="subtle" size="sm" class="font-mono tracking-wider uppercase">
        <span class="size-1.5 rounded-full bg-primary" />
        Account recovery
      </UBadge>
    </div>

    <section
      v-if="!hasToken"
      class="space-y-6 rounded-2xl border border-default bg-default p-5 shadow-xl sm:p-8"
    >
      <div class="flex items-start gap-3.5">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-error/30 bg-error/10 text-error"
        >
          <UIcon name="i-lucide-link-2-off" class="size-5" />
        </span>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-highlighted sm:text-[26px]">
            Link expired
          </h1>
          <p class="mt-1 text-sm text-muted">
            This reset link is invalid, already used, or has expired.
          </p>
        </div>
      </div>

      <UButton to="/forgot-password" size="lg" block class="font-bold">
        Request a new link
        <UIcon name="i-lucide-arrow-right" class="size-4" />
      </UButton>

      <div class="flex justify-center border-t border-default pt-2">
        <NuxtLink to="/sign-in" class="text-xs font-semibold text-primary hover:underline">
          ← Back to sign in
        </NuxtLink>
      </div>
    </section>

    <section
      v-else
      class="space-y-6 rounded-2xl border border-default bg-default p-5 shadow-xl sm:p-8"
    >
      <div class="flex items-start gap-3.5">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"
        >
          <UIcon name="i-lucide-key-round" class="size-5" />
        </span>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-highlighted sm:text-[26px]">
            Set a new password
          </h1>
          <p class="mt-1 text-sm text-muted">Choose a password for this household account.</p>
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
        <UFormField name="password" label="New password" required :ui="fieldUi">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Create a new password"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="new-password"
            class="w-full"
            :ui="inputUi"
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

        <UFormField name="confirmPassword" label="Confirm password" required :ui="fieldUi">
          <UInput
            v-model="state.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Confirm your password"
            size="lg"
            color="neutral"
            variant="outline"
            autocomplete="new-password"
            class="w-full"
            :ui="inputUi"
          >
            <template #trailing>
              <UButton
                :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="
                  showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                "
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton type="submit" size="lg" block class="font-bold" :loading="isSubmitting">
          Update password
          <UIcon name="i-lucide-arrow-right" class="size-4" />
        </UButton>
      </UForm>

      <div class="flex justify-center border-t border-default pt-2">
        <NuxtLink to="/sign-in" class="text-xs font-semibold text-primary hover:underline">
          ← Back to sign in
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
