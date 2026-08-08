<script setup lang="ts">
const { user } = useUserSession();

const dismissed = ref(false);
const resending = ref(false);
const resent = ref(false);

const resendVerification = useAuthClientAction((client) => client.sendVerificationEmail);

const pending = computed(() => resendVerification.status.value === "pending");

const visible = computed(
  () => !!user.value && user.value.emailVerified === false && !dismissed.value,
);

async function onResend() {
  if (!user.value) return;
  await resendVerification.execute({
    email: user.value.email,
    callbackURL: "/dashboard",
  });
  if (resendVerification.status.value === "success") resent.value = true;
}
</script>

<template>
  <UAlert
    v-if="visible"
    color="warning"
    variant="subtle"
    icon="i-lucide-alert-triangle"
    :title="resent ? 'Verification email sent' : 'Verify your email to invite members'"
    :description="
      resent
        ? 'Check your inbox for the verification link.'
        : 'You can use Tricker, but invites and some features are locked until your email is verified.'
    "
    :close="{ onClick: () => (dismissed = true) }"
  >
    <template #actions>
      <UButton
        v-if="!resent"
        color="warning"
        variant="solid"
        size="xs"
        :loading="pending"
        :disabled="pending"
        @click="onResend"
      >
        Resend link
      </UButton>
    </template>
  </UAlert>
</template>
