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
  <div class="space-y-6">
    <template v-if="!hasToken">
      <h1 class="text-center text-2xl font-semibold tracking-tight text-highlighted">
        Link Expired
      </h1>

      <p class="text-center text-sm text-muted">
        This reset link is invalid, already consumed, or has expired.
      </p>

      <div class="pt-2">
        <UButton to="/forgot-password" label="Request new link" size="lg" block class="font-bold" />
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
        Set New Password
      </h1>

      <UAlert
        v-if="authError"
        icon="i-lucide-alert-circle"
        :title="authError.title"
        color="error"
        variant="subtle"
      />

      <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
        <UFormField name="password" label="New password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Create a new password"
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

        <UFormField name="confirmPassword" label="Confirm password">
          <UInput
            v-model="state.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Confirm your password"
            size="lg"
            autocomplete="new-password"
            class="w-full"
            :ui="{ trailing: 'pr-1.5' }"
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
        <NuxtLink
          to="/sign-in"
          class="font-medium text-highlighted underline underline-offset-2 transition-colors hover:text-primary"
        >
          Back to sign in
        </NuxtLink>
      </p>
    </template>
  </div>
</template>
