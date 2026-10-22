<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";

useHead({ title: "Account Settings · Tricker" });

const { user, session, fetchSession, signOut, updateUser } = useUserSession();
const { rooms } = useRoomMemberships();
const revokeSessions = useAuthClientAction((client) => client.revokeSessions);
const toast = useToast();

const { data, status, refresh } = useFetch("/api/account");
const account = computed(() => (isSuccessResponse(data.value) ? data.value.data : null));

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Keep it under 80 characters"),
});
type NameSchema = z.output<typeof nameSchema>;

const nameState = reactive<NameSchema>({ name: "" });
const interaction = reactive({
  savingName: false,
  savingPassword: false,
  avatarAction: null as "upload" | "remove" | null,
  showCurrent: false,
  showNew: false,
  signingOut: false,
});

watch(
  () => account.value?.name,
  (name) => {
    if (name) nameState.name = name;
  },
  { immediate: true, flush: "sync" },
);

const profile = computed(() => {
  const memberships = (account.value?.memberships ?? []).map((membership) => ({
    ...membership,
    role: rooms.value.find((room) => room.id === membership.roomId)?.role,
  }));
  return {
    nameDirty: nameState.name.trim() !== (account.value?.name ?? ""),
    memberships,
    roomsCountLabel: `${memberships.length} room${memberships.length === 1 ? "" : "s"}`,
    roomsListLabel: memberships.map((membership) => membership.roomName).join(", "),
    memberSince: user.value?.createdAt
      ? toDayJS(new Date(user.value.createdAt).toISOString()).tz(PHNOM_PENH_TZ).format("MMMM YYYY")
      : null,
    sessionStarted: session.value?.createdAt
      ? toDayJS(new Date(session.value.createdAt).toISOString())
          .tz(PHNOM_PENH_TZ)
          .format("MMM D, YYYY")
      : null,
  };
});

const verificationBadge = computed(() => ({
  label: user.value?.emailVerified ? "Verified account" : "Email unverified",
  icon: user.value?.emailVerified ? "i-lucide-circle-check" : "i-lucide-mail",
  color: user.value?.emailVerified ? ("success" as const) : ("warning" as const),
}));

const passwordVisibility = computed(() => ({
  current: {
    type: interaction.showCurrent ? "text" : "password",
    icon: interaction.showCurrent ? "i-lucide-eye-off" : "i-lucide-eye",
    label: interaction.showCurrent ? "Hide current password" : "Show current password",
  },
  next: {
    type: interaction.showNew ? "text" : "password",
    icon: interaction.showNew ? "i-lucide-eye-off" : "i-lucide-eye",
    label: interaction.showNew ? "Hide new password" : "Show new password",
  },
}));

const MAX_AVATAR_BYTES = 1024 * 1024;
const fileInput = ref<HTMLInputElement | null>(null);

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
      color: "error",
      description: "Avatars must be an image such as JPG, PNG, or WebP.",
    });
    return;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Image too large",
      color: "error",
      description: "Avatars must be 1 MB or smaller.",
    });
    return;
  }
  void uploadAvatar(file);
}

async function uploadAvatar(file: File) {
  if (interaction.avatarAction) return;
  interaction.avatarAction = "upload";
  try {
    const body = new FormData();
    body.append("avatar", file);
    const res = await $fetch<ApiResponse<{ image: string }>>("/api/account/avatar", {
      method: "POST",
      body,
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await Promise.all([refresh(), fetchSession({ force: true })]);
    toast.add({ icon: "i-lucide-circle-check", title: "Photo updated", color: "success" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      color: "error",
      description: e instanceof Error ? e.message : "Could not upload your photo.",
    });
  } finally {
    interaction.avatarAction = null;
  }
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Keep it under 128 characters"),
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

async function onSaveName(event: FormSubmitEvent<NameSchema>) {
  if (interaction.savingName || !profile.value.nameDirty) return;
  interaction.savingName = true;
  try {
    const res = await $fetch<ApiResponse<{ name: string }>>("/api/account", {
      method: "PATCH",
      body: { name: event.data.name },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    await Promise.all([refresh(), fetchSession({ force: true })]);
    toast.add({ icon: "i-lucide-circle-check", title: "Name updated", color: "success" });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      color: "error",
      description: e instanceof Error ? e.message : "Could not update your name.",
    });
  } finally {
    interaction.savingName = false;
  }
}

async function onChangePassword(event: FormSubmitEvent<PasswordSchema>) {
  if (interaction.savingPassword) return;
  interaction.savingPassword = true;
  try {
    const res = await $fetch<ApiResponse<{ signedOut: true }>>("/api/account/password", {
      method: "POST",
      body: {
        currentPassword: event.data.currentPassword,
        newPassword: event.data.newPassword,
      },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    toast.add({ icon: "i-lucide-circle-check", title: "Password changed", color: "success" });
    await signOut();
    await navigateTo("/sign-in");
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      color: "error",
      description: e instanceof Error ? e.message : "Could not change your password.",
    });
  } finally {
    interaction.savingPassword = false;
  }
}

async function removeAvatar() {
  if (interaction.avatarAction || !account.value?.image) return;
  interaction.avatarAction = "remove";
  try {
    await updateUser({ image: null });
    await Promise.all([refresh(), fetchSession({ force: true })]);
    toast.add({ title: "Photo removed", icon: "i-lucide-circle-check", color: "success" });
  } catch (e) {
    toast.add({
      title: "Could not remove photo",
      color: "error",
      description: e instanceof Error ? e.message : "Please try again.",
    });
  } finally {
    interaction.avatarAction = null;
  }
}

async function signOutAllDevices() {
  if (interaction.signingOut) return;
  interaction.signingOut = true;
  try {
    await revokeSessions.execute();
    if (revokeSessions.status.value !== "success") {
      throw new Error(revokeSessions.error.value?.message ?? "Could not sign out all devices.");
    }
    await signOut();
    await navigateTo("/sign-in");
  } catch (e) {
    toast.add({
      title: "Could not sign out all devices",
      color: "error",
      description: e instanceof Error ? e.message : "Please try again.",
    });
  } finally {
    interaction.signingOut = false;
  }
}
</script>

<template>
  <UContainer class="max-w-6xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-default pb-6">
      <div class="space-y-2">
        <p class="text-xs font-medium tracking-wider text-muted uppercase">User settings</p>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
          Account Profile &amp; Security
        </h1>
        <p class="text-sm text-muted">
          Manage your public profile, household nicknames, and password.
        </p>
      </div>
      <UBadge
        :label="verificationBadge.label"
        :icon="verificationBadge.icon"
        :color="verificationBadge.color"
        variant="subtle"
        class="rounded-full"
      />
    </div>

    <div v-if="status === 'pending' && !account" class="grid gap-6 lg:grid-cols-3">
      <USkeleton class="h-96 rounded-xl lg:col-span-2" />
      <USkeleton class="h-64 rounded-xl" />
    </div>
    <UEmpty
      v-else-if="!account"
      icon="i-lucide-user"
      title="Account unavailable"
      description="We could not load your profile. Please try again."
      :actions="[{ label: 'Try again', onClick: () => refresh() }]"
    />
    <div v-else class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <UCard class="rounded-xl" :ui="{ body: 'p-5 sm:p-6' }">
          <UForm :schema="nameSchema" :state="nameState" class="space-y-6" @submit="onSaveName">
            <div class="space-y-1">
              <h2 class="font-semibold text-highlighted">Identity</h2>
              <p class="text-sm text-muted">
                Your public name and profile picture across all households.
              </p>
            </div>

            <div class="flex items-center gap-5">
              <UAvatar
                :src="account.image ?? undefined"
                :alt="account.name"
                :text="avatarInitials"
                size="3xl"
                class="shrink-0 ring-4 ring-muted"
              />
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <UButton
                    label="Upload photo"
                    icon="i-lucide-upload"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    :loading="interaction.avatarAction === 'upload'"
                    :disabled="!!interaction.avatarAction"
                    @click="fileInput?.click()"
                  />
                  <UButton
                    v-if="account.image"
                    label="Remove"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :loading="interaction.avatarAction === 'remove'"
                    :disabled="!!interaction.avatarAction"
                    @click="removeAvatar"
                  />
                </div>
                <p class="text-xs text-muted">JPG, PNG, or WebP. Max 1 MB.</p>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  aria-label="Upload profile photo"
                  class="sr-only"
                  @change="onPickAvatar"
                />
              </div>
            </div>

            <UFormField
              label="Email"
              name="email"
              help="Your email is used to sign in and cannot be changed here."
            >
              <UInput
                :model-value="account.email"
                type="email"
                icon="i-lucide-lock"
                readonly
                class="w-full sm:max-w-md"
                size="lg"
              />
            </UFormField>
            <UFormField label="Display name" name="name" required>
              <UInput
                v-model="nameState.name"
                autocomplete="name"
                :maxlength="80"
                class="w-full sm:max-w-md"
                size="lg"
                :disabled="interaction.savingName"
              />
            </UFormField>
            <UButton
              type="submit"
              label="Save name changes"
              icon="i-lucide-check"
              :loading="interaction.savingName"
              :disabled="!profile.nameDirty"
              class="w-full justify-center sm:w-auto"
            />
          </UForm>
        </UCard>

        <UCard class="rounded-xl" :ui="{ body: 'space-y-5 p-5 sm:p-6' }">
          <div class="space-y-1">
            <h2 class="font-semibold text-highlighted">Room Profiles</h2>
            <p class="text-sm text-muted">
              Customize your nickname and avatar color in each household.
            </p>
          </div>
          <AccountRoomProfile
            v-for="membership in profile.memberships"
            :key="membership.id"
            :membership="membership"
            @saved="refresh()"
          />
          <div
            v-if="!profile.memberships.length"
            class="rounded-lg border border-dashed border-default p-5 text-center"
          >
            <UIcon name="i-lucide-house" class="size-6 text-muted" />
            <p class="mt-2 text-sm text-muted">Join a room to set how you appear to housemates.</p>
            <UButton
              to="/rooms"
              label="Find your household"
              color="neutral"
              variant="outline"
              class="mt-4"
            />
          </div>
        </UCard>

        <UCard class="rounded-xl" :ui="{ body: 'p-5 sm:p-6' }">
          <UForm
            :schema="passwordSchema"
            :state="passwordState"
            class="space-y-5"
            @submit="onChangePassword"
          >
            <div class="space-y-1">
              <h2 class="font-semibold text-highlighted">Password &amp; Security</h2>
              <p class="text-sm text-muted">
                You'll be signed out after changing your password and need to sign in again.
              </p>
            </div>
            <div class="max-w-md space-y-4">
              <UFormField label="Current password" name="currentPassword" required>
                <UInput
                  v-model="passwordState.currentPassword"
                  :type="passwordVisibility.current.type"
                  autocomplete="current-password"
                  class="w-full"
                  size="lg"
                  :disabled="interaction.savingPassword"
                >
                  <template #trailing>
                    <UButton
                      type="button"
                      :icon="passwordVisibility.current.icon"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :aria-label="passwordVisibility.current.label"
                      @click="interaction.showCurrent = !interaction.showCurrent"
                    />
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="New password"
                name="newPassword"
                required
                help="Use 8 to 128 characters."
              >
                <UInput
                  v-model="passwordState.newPassword"
                  :type="passwordVisibility.next.type"
                  autocomplete="new-password"
                  class="w-full"
                  size="lg"
                  :disabled="interaction.savingPassword"
                >
                  <template #trailing>
                    <UButton
                      type="button"
                      :icon="passwordVisibility.next.icon"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :aria-label="passwordVisibility.next.label"
                      @click="interaction.showNew = !interaction.showNew"
                    />
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Confirm new password" name="confirmPassword" required>
                <UInput
                  v-model="passwordState.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  class="w-full"
                  size="lg"
                  :disabled="interaction.savingPassword"
                />
              </UFormField>
            </div>
            <UButton
              type="submit"
              label="Update password"
              icon="i-lucide-key-round"
              color="neutral"
              :loading="interaction.savingPassword"
              class="w-full justify-center sm:w-auto"
            />
          </UForm>
        </UCard>
      </div>

      <aside class="space-y-6">
        <UCard class="rounded-xl" :ui="{ body: 'space-y-5 p-5' }">
          <h2 class="text-xs font-semibold tracking-wider text-muted uppercase">Account Summary</h2>
          <dl class="space-y-5 text-sm">
            <div class="space-y-1.5">
              <dt class="text-xs text-muted">Active household rooms</dt>
              <dd class="font-semibold text-highlighted">
                {{ profile.roomsCountLabel }}
              </dd>
              <dd v-if="profile.memberships.length" class="text-xs leading-relaxed text-muted">
                {{ profile.roomsListLabel }}
              </dd>
            </div>
            <div v-if="profile.memberSince" class="space-y-1.5">
              <dt class="text-xs text-muted">Member since</dt>
              <dd>{{ profile.memberSince }}</dd>
            </div>
            <div class="space-y-1.5">
              <dt class="text-xs text-muted">Sign-in method</dt>
              <dd class="flex items-center gap-2">
                <UIcon name="i-lucide-fingerprint" class="size-4 text-muted" /> Email &amp; password
              </dd>
            </div>
            <div v-if="profile.sessionStarted" class="space-y-1.5 border-t border-default pt-5">
              <dt class="text-xs text-muted">Current session</dt>
              <dd>Signed in {{ profile.sessionStarted }}</dd>
            </div>
          </dl>
        </UCard>
        <UCard class="rounded-xl" :ui="{ body: 'space-y-4 p-5' }">
          <h2 class="flex items-center gap-2 font-semibold text-highlighted">
            <UIcon name="i-lucide-monitor-smartphone" class="size-5 text-muted" /> Active Sessions
          </h2>
          <p class="text-sm leading-relaxed text-muted">
            Lost a device or signed in on a shared computer? Sign out everywhere, including this
            device.
          </p>
          <UButton
            label="Sign out all devices"
            icon="i-lucide-log-out"
            color="neutral"
            variant="outline"
            block
            :loading="interaction.signingOut"
            @click="signOutAllDevices"
          />
        </UCard>
        <p class="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
          <UIcon name="i-lucide-shield-check" class="size-4 shrink-0" />
          Your households stay separate. Roommates can only see expenses in rooms they belong to.
        </p>
      </aside>
    </div>
  </UContainer>
</template>
