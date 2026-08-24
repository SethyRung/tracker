<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";

definePageMeta({ layout: "bare" });

useHead({ title: "Account · Tricker" });

const { fetchSession, signOut } = useUserSession();
const toast = useToast();

const { data, status, refresh } = useFetch("/api/account");
const account = computed(() => (isSuccessResponse(data.value) ? data.value.data : null));
const loading = computed(() => status.value === "pending" && !account.value);

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Keep it under 80 characters"),
});
type NameSchema = z.output<typeof nameSchema>;

const nameState = reactive<NameSchema>({ name: "" });
const savingName = ref(false);

watch(
  () => account.value?.name,
  (name) => {
    if (name) nameState.name = name;
  },
  { immediate: true },
);

const nameDirty = computed(() => nameState.name.trim() !== (account.value?.name ?? ""));

const MAX_AVATAR_BYTES = 1024 * 1024;
const fileInput = ref<HTMLInputElement | null>(null);
const uploadingAvatar = ref(false);

const avatarInitials = computed(() =>
  (account.value?.name ?? "")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase(),
);

function onPickAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Use an image file",
      description: "Avatars must be an image such as JPG, PNG, or WebP.",
    });
    return;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Image too large",
      description: "Avatars must be 1 MB or smaller.",
    });
    return;
  }
  void uploadAvatar(file);
}

async function uploadAvatar(file: File) {
  if (uploadingAvatar.value) return;
  uploadingAvatar.value = true;
  try {
    const body = new FormData();
    body.append("avatar", file);
    const res = await $fetch<ApiResponse<{ image: string }>>("/api/account/avatar", {
      method: "POST",
      body,
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await Promise.all([refresh(), fetchSession({ force: true })]);
    toast.add({ icon: "i-lucide-circle-check", title: "Photo updated" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not upload your photo.",
    });
  } finally {
    uploadingAvatar.value = false;
  }
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordSchema = z.output<typeof passwordSchema>;

const passwordState = reactive<Partial<PasswordSchema>>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const savingPassword = ref(false);
const showCurrent = ref(false);
const showNew = ref(false);

async function onSaveName(event: FormSubmitEvent<NameSchema>) {
  if (savingName.value) return;
  savingName.value = true;
  try {
    const res = await $fetch<ApiResponse<{ name: string }>>("/api/account", {
      method: "PATCH",
      body: { name: event.data.name },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await Promise.all([refresh(), fetchSession({ force: true })]);
    toast.add({ icon: "i-lucide-circle-check", title: "Name updated" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not update your name.",
    });
  } finally {
    savingName.value = false;
  }
}

async function onChangePassword(event: FormSubmitEvent<PasswordSchema>) {
  if (savingPassword.value) return;
  savingPassword.value = true;
  try {
    const res = await $fetch<ApiResponse<{ signedOut: true }>>("/api/account/password", {
      method: "POST",
      body: {
        currentPassword: event.data.currentPassword,
        newPassword: event.data.newPassword,
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Password changed" });
    await signOut();
    await navigateTo("/sign-in");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not change your password.",
    });
  } finally {
    savingPassword.value = false;
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-6 space-y-6">
    <div class="space-y-1">
      <p class="font-mono text-xs uppercase tracking-wider text-toned">Account</p>
      <h1 class="font-pixel-circle text-2xl text-primary">Profile</h1>
      <p class="text-xs text-toned">Your photo, name, password, and how you appear in each room.</p>
    </div>

    <USkeleton v-if="loading" class="h-64 rounded-xl" />

    <template v-else>
      <UCard variant="outline" :ui="{ body: 'p-5' }">
        <UForm :schema="nameSchema" :state="nameState" class="space-y-5" @submit="onSaveName">
          <div class="space-y-1">
            <h2 class="text-sm font-medium text-default">Identity</h2>
            <p class="text-sm text-toned">Email is your login and cannot be changed.</p>
          </div>

          <div class="flex items-center gap-4">
            <UAvatar
              :src="account?.image ?? undefined"
              :alt="account?.name ?? 'Avatar'"
              :text="avatarInitials"
              size="xl"
            />
            <div class="space-y-2">
              <p class="text-sm text-toned">JPG, PNG, or WebP. Max 1 MB.</p>
              <UButton
                label="Upload photo"
                color="neutral"
                variant="outline"
                size="sm"
                :loading="uploadingAvatar"
                @click="fileInput?.click()"
              />
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="sr-only"
                @change="onPickAvatar"
              />
            </div>
          </div>

          <UFormField label="Email" name="email">
            <UInput :model-value="account?.email ?? ''" disabled :ui="{ root: 'w-full' }" />
          </UFormField>

          <UFormField label="Display name" name="name" required>
            <UInput v-model="nameState.name" :ui="{ root: 'w-full' }" />
          </UFormField>

          <UButton type="submit" label="Save name" :loading="savingName" :disabled="!nameDirty" />
        </UForm>
      </UCard>

      <AccountRoomProfile
        :memberships="account?.memberships ?? []"
        @saved="refresh()"
      />

      <UCard variant="outline" :ui="{ body: 'p-5' }">
        <UForm
          :schema="passwordSchema"
          :state="passwordState"
          class="space-y-5"
          @submit="onChangePassword"
        >
          <div class="space-y-1">
            <h2 class="text-sm font-medium text-default">Password</h2>
            <p class="text-sm text-toned">
              You'll be signed out after a change and need to sign in again.
            </p>
          </div>

          <UFormField label="Current password" name="currentPassword" required>
            <UInput
              v-model="passwordState.currentPassword"
              :type="showCurrent ? 'text' : 'password'"
              autocomplete="current-password"
              :ui="{ root: 'w-full' }"
            >
              <template #trailing>
                <UButton
                  :icon="showCurrent ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :aria-label="showCurrent ? 'Hide password' : 'Show password'"
                  @click="showCurrent = !showCurrent"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField label="New password" name="newPassword" required>
            <UInput
              v-model="passwordState.newPassword"
              :type="showNew ? 'text' : 'password'"
              autocomplete="new-password"
              :ui="{ root: 'w-full' }"
            >
              <template #trailing>
                <UButton
                  :icon="showNew ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :aria-label="showNew ? 'Hide password' : 'Show password'"
                  @click="showNew = !showNew"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField label="Confirm new password" name="confirmPassword" required>
            <UInput
              v-model="passwordState.confirmPassword"
              type="password"
              autocomplete="new-password"
              :ui="{ root: 'w-full' }"
            />
          </UFormField>

          <UButton
            type="submit"
            label="Change password"
            color="neutral"
            :loading="savingPassword"
          />
        </UForm>
      </UCard>
    </template>
  </UContainer>
</template>
