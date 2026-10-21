<script setup lang="ts">
const COOLDOWN_MS = 60_000;

const { user } = useUserSession();
const toast = useToast();

const dismissed = useState("email-verification-dismissed", () => false);
const cooldownUntil = useState<number | null>("email-verify-cooldown-until", () => null);
const nowTick = ref(Date.now());

const resendVerification = useAuthClientAction((client) => client.sendVerificationEmail);
const pending = computed(() => resendVerification.status.value === "pending");

const visible = computed(
  () => !!user.value && user.value.emailVerified === false && !dismissed.value,
);

const cooldownLeft = computed(() => {
  if (!cooldownUntil.value) return 0;
  return Math.max(0, Math.ceil((cooldownUntil.value - nowTick.value) / 1000));
});

const phase = computed<"idle" | "sending" | "sent">(() => {
  if (pending.value) return "sending";
  if (cooldownLeft.value > 0) return "sent";
  return "idle";
});

const title = computed(() => {
  if (phase.value === "sending") return "Resending verification email...";
  if (phase.value === "sent") return "Verification email sent";
  return "Verify your email to invite members";
});

const icon = computed(() => {
  if (phase.value === "sending") return "i-lucide-loader-circle";
  if (phase.value === "sent") return "i-lucide-circle-check";
  return "i-lucide-mail";
});

const webmailHref = computed(() => webmailUrl(user.value?.email ?? ""));

const { pause: stopTick, resume: startTick } = useIntervalFn(
  () => {
    nowTick.value = Date.now();
  },
  1000,
  { immediate: false },
);

watch(
  cooldownLeft,
  (left) => {
    if (left > 0) startTick();
    else stopTick();
  },
  { immediate: true },
);

async function onResend() {
  if (!user.value || pending.value || cooldownLeft.value > 0) return;
  await resendVerification.execute({
    email: user.value.email,
    callbackURL: "/",
  });
  if (resendVerification.status.value === "success") {
    nowTick.value = Date.now();
    cooldownUntil.value = nowTick.value + COOLDOWN_MS;
    return;
  }
  toast.add({
    icon: "i-lucide-circle-x",
    title: "Could not send verification email",
    description: resendVerification.error.value?.message ?? "Try again in a minute.",
  });
}

function webmailUrl(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "https://mail.google.com";
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") {
    return "https://outlook.live.com/mail/";
  }
  if (domain === "yahoo.com" || domain.endsWith(".yahoo.com")) return "https://mail.yahoo.com";
  if (domain === "icloud.com" || domain === "me.com") return "https://www.icloud.com/mail";
  if (email.includes("@")) return `mailto:${email}`;
  return "";
}
</script>

<template>
  <UContainer v-if="visible" class="max-w-6xl">
    <div
      class="flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
      :class="
        phase === 'sent' ? 'border-success/30 bg-success/10' : 'border-warning/25 bg-warning/10'
      "
    >
      <div class="flex items-start gap-3 sm:flex-1 sm:items-center">
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg border sm:size-9"
          :class="
            phase === 'sent'
              ? 'border-success/30 bg-success/20 text-success'
              : 'border-warning/30 bg-warning/20 text-warning'
          "
        >
          <UIcon
            :name="icon"
            class="size-4 sm:size-5"
            :class="{ 'animate-spin': phase === 'sending' }"
          />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p
              class="text-sm font-bold tracking-tight"
              :class="phase === 'sent' ? 'text-highlighted' : 'text-warning'"
            >
              {{ title }}
            </p>
            <UBadge
              v-if="phase === 'idle'"
              label="Restricted mode"
              color="warning"
              variant="subtle"
              size="sm"
              class="font-mono tracking-wider uppercase"
            />
          </div>

          <p class="mt-0.5 text-sm leading-relaxed text-toned">
            <template v-if="phase === 'sending'">
              Contacting the mail provider. This usually takes a moment.
            </template>
            <template v-else-if="phase === 'sent'">
              Check your inbox for the verification link.
              <span class="font-mono text-highlighted">Cooldown: {{ cooldownLeft }}s</span>
            </template>
            <template v-else>
              You can track expenses, but roommate invites and room deletion are locked until your
              email is confirmed. Sent to
              <code
                class="rounded border border-warning/30 bg-elevated px-1.5 py-0.5 font-mono text-xs text-warning"
              >
                {{ user?.email }}
              </code>.
            </template>
          </p>
        </div>

        <UButton
          v-if="phase !== 'sending'"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Dismiss"
          class="shrink-0 sm:hidden"
          @click="dismissed = true"
        />
      </div>

      <div class="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
        <UButton
          v-if="phase !== 'sent'"
          color="warning"
          variant="solid"
          size="sm"
          icon="i-lucide-send"
          :loading="phase === 'sending'"
          :disabled="phase === 'sending'"
          :label="phase === 'sending' ? 'Sending...' : 'Resend link'"
          class="w-full sm:w-auto"
          @click="onResend"
        />
        <div v-else class="flex w-full items-center justify-between gap-2 sm:w-auto">
          <span class="font-mono text-xs text-muted sm:hidden">{{ cooldownLeft }}s</span>
          <UButton
            v-if="webmailHref"
            :to="webmailHref"
            target="_blank"
            color="neutral"
            variant="outline"
            size="sm"
            label="Open webmail"
            trailing-icon="i-lucide-external-link"
            external
          />
        </div>

        <UButton
          v-if="phase !== 'sending'"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Dismiss"
          class="hidden shrink-0 sm:inline-flex"
          @click="dismissed = true"
        />
      </div>
    </div>
  </UContainer>
</template>
