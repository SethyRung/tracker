<script setup lang="ts">
import * as z from "zod";

const props = defineProps<{ roomId: string }>();
const open = defineModel<boolean>("open", { default: false });

const toast = useToast();
const { rooms } = useRoomMemberships();
const { isMD } = useBreakpoints();

const room = computed(() => rooms.value.find((item) => item.id === props.roomId) ?? null);
const roomName = computed(() => room.value?.name ?? "this room");
const ledgerLabel = computed(() => {
  if (!room.value) return "—";
  if (room.value.usdEnabled && room.value.khrEnabled) return "USD + KHR";
  if (room.value.usdEnabled) return "USD";
  if (room.value.khrEnabled) return "KHR";
  return "—";
});

const tab = ref<"link" | "email">("link");
const loading = ref(false);
const rotating = ref(false);
const submitting = ref(false);
const copied = ref(false);

const joinUrl = ref("");
const expiresAt = ref("");

type EmailRow = { id: number; email: string };
let nextRowId = 1;
function blankRow(): EmailRow {
  return { id: nextRowId++, email: "" };
}

const emails = ref<EmailRow[]>([blankRow()]);

const emailSchema = z.email();

function isValidEmail(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 && emailSchema.safeParse(trimmed).success;
}

const readyEmails = computed(() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of emails.value) {
    const value = row.email.trim();
    if (!isValidEmail(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
});

const readyCount = computed(() => readyEmails.value.length);
const hasInvalid = computed(() =>
  emails.value.some((row) => {
    const value = row.email.trim();
    return value.length > 0 && !isValidEmail(value);
  }),
);

const sendLabel = computed(() => {
  if (readyCount.value === 1) return "Send 1 invite";
  if (readyCount.value > 1) return `Send ${readyCount.value} invites`;
  return "Send invites";
});

const validityLabel = computed(() => {
  if (!expiresAt.value) return "Valid for 7 days";
  const hours = toDayJS(expiresAt.value).diff(toDayJS(new Date().toISOString()), "hour");
  const days = Math.max(1, Math.ceil(hours / 24));
  return days === 1 ? "Valid for 1 day" : `Valid for ${days} days`;
});

const tabItems = computed(() => [
  { label: "Share link", icon: "i-lucide-link", value: "link", slot: "link" },
  {
    label: "Email invites",
    icon: "i-lucide-mail",
    value: "email",
    slot: "email",
    badge: readyCount.value > 0 ? readyCount.value : undefined,
  },
]);

const storageKey = computed(() => `tricker.invite-link.${props.roomId}`);

function readStoredLink() {
  if (!import.meta.client) return null;
  const raw = sessionStorage.getItem(storageKey.value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { joinUrl?: string; expiresAt?: string };
    if (!parsed.joinUrl || !parsed.expiresAt) return null;
    if (!toDayJS(parsed.expiresAt).isAfter(toDayJS(new Date().toISOString()))) return null;
    return { joinUrl: parsed.joinUrl, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function applyLink(link: { joinUrl: string; expiresAt: string }) {
  joinUrl.value = link.joinUrl;
  expiresAt.value = link.expiresAt;
  if (import.meta.client) sessionStorage.setItem(storageKey.value, JSON.stringify(link));
}

function resetEmails() {
  emails.value = [blankRow()];
  submitting.value = false;
  copied.value = false;
  tab.value = "link";
}

function addEmail() {
  if (emails.value.length >= 20) return;
  emails.value.push(blankRow());
}

function removeEmail(id: number) {
  if (emails.value.length === 1) {
    emails.value[0]!.email = "";
    return;
  }
  emails.value = emails.value.filter((row) => row.id !== id);
}

function rowError(email: string) {
  const value = email.trim();
  if (!value || isValidEmail(value)) return;
  return "Invalid email";
}

async function createInviteLink() {
  const stored = readStoredLink();
  if (stored) {
    applyLink(stored);
    return;
  }

  loading.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/invite-links/create`, { method: "POST" });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    applyLink(res.data);
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not create invite link.",
    });
  } finally {
    loading.value = false;
  }
}

async function rotateLink() {
  if (rotating.value || loading.value) return;
  rotating.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/invite-links/rotate`, { method: "POST" });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);
    applyLink(res.data);
    copied.value = false;
    toast.add({
      icon: "i-lucide-circle-check",
      title: "Invite link rotated",
      description: "Previous unused links no longer work.",
    });
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not rotate the invite link.",
    });
  } finally {
    rotating.value = false;
  }
}

async function copyLink() {
  if (!joinUrl.value) return;
  try {
    await navigator.clipboard.writeText(joinUrl.value);
    copied.value = true;
    toast.add({ icon: "i-lucide-circle-check", title: "Copied" });
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Could not copy",
      description: "Select the link and copy it manually.",
    });
  }
}

async function shareLink() {
  if (!joinUrl.value) return;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `Join ${roomName.value}`, url: joinUrl.value });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  await copyLink();
}

function formatEmails(values: string[], max = 4) {
  if (values.length <= max) return values.join(", ");
  return `${values.slice(0, max).join(", ")} and ${values.length - max} more`;
}

async function onSubmit() {
  if (submitting.value) return;
  if (hasInvalid.value || readyCount.value === 0) return;

  submitting.value = true;
  try {
    const res = await $fetch(`/api/rooms/${props.roomId}/invite-links/send`, {
      method: "POST",
      body: { emails: readyEmails.value },
    });
    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    const successful = res.data.filter((row) => row.emailSent).map((row) => row.email);
    const failed = res.data.filter((row) => !row.emailSent).map((row) => row.email);

    if (successful.length === 0) {
      toast.add({
        color: "error",
        icon: "i-lucide-circle-x",
        title: "No invites sent",
        description: failed.length > 0 ? `Failed: ${formatEmails(failed)}` : "Please try again.",
      });
      return;
    }

    if (failed.length > 0) {
      toast.add({
        color: "warning",
        icon: "i-lucide-triangle-alert",
        title: "Some invites failed",
        description: `Sent to ${formatEmails(successful)}. Failed: ${formatEmails(failed)}`,
      });
      return;
    }

    toast.add({
      color: "success",
      icon: "i-lucide-circle-check",
      title: "Invites sent",
      description: formatEmails(successful),
    });
    open.value = false;
  } catch (e) {
    toast.add({
      icon: "i-lucide-circle-x",
      title: "Error",
      description: e instanceof Error ? e.message : "Could not send invites.",
    });
  } finally {
    submitting.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) createInviteLink();
  else resetEmails();
});
</script>

<template>
  <Panel
    v-model:open="open"
    title="Invite roommates"
    :description="`Bring housemates into ${roomName} to track shared bills.`"
    :modal="{ ui: { content: 'max-w-lg', footer: 'block' } }"
    :drawer="{ ui: { footer: 'block' } }"
  >
    <slot />

    <template #body>
      <UTabs
        v-model="tab"
        :items="tabItems"
        variant="pill"
        color="neutral"
        size="sm"
        :unmount-on-hide="false"
        class="w-full"
        :ui="{ list: 'w-full', trigger: 'flex-1 justify-center' }"
      >
        <template #link>
          <div class="space-y-4 pt-4">
            <div class="space-y-3 rounded-xl border border-default bg-elevated/40 p-4">
              <div class="flex items-center justify-between gap-2">
                <p class="font-mono text-[11px] tracking-wider text-muted uppercase">
                  Universal join link
                </p>
                <UBadge
                  color="success"
                  variant="subtle"
                  icon="i-lucide-clock"
                  :label="validityLabel"
                  class="rounded-full"
                />
              </div>

              <UFieldGroup class="flex" size="md">
                <UInput
                  :model-value="joinUrl"
                  :placeholder="loading ? 'Generating…' : ''"
                  readonly
                  :ui="{ root: 'flex-1', base: 'h-full font-mono text-xs' }"
                />
                <UButton
                  :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                  :loading="loading"
                  :disabled="loading || !joinUrl"
                  color="neutral"
                  variant="outline"
                  @click="copyLink"
                />
              </UFieldGroup>

              <div class="flex items-center justify-between gap-2 border-t border-default pt-2">
                <UButton
                  icon="i-lucide-refresh-cw"
                  label="Rotate link"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :loading="rotating"
                  :disabled="loading || rotating || !joinUrl"
                  @click="rotateLink"
                />
                <UButton
                  icon="i-lucide-share"
                  label="Share"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :disabled="!joinUrl"
                  @click="shareLink"
                />
              </div>
            </div>

            <UAlert
              color="warning"
              variant="subtle"
              icon="i-lucide-shield"
              title="Zero-approval link"
              :description="`Anyone with this link can join ${roomName} directly, without admin approval.`"
            />

            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-default bg-default p-2.5">
                <p class="font-mono text-[11px] tracking-wider text-dimmed uppercase">
                  Target room
                </p>
                <p class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-highlighted">
                  <span class="size-1.5 shrink-0 rounded-full bg-primary" />
                  <span class="truncate">{{ roomName }}</span>
                </p>
              </div>
              <div class="rounded-lg border border-default bg-default p-2.5">
                <p class="font-mono text-[11px] tracking-wider text-dimmed uppercase">
                  Active ledgers
                </p>
                <p class="mt-1 font-mono text-sm font-semibold text-highlighted">
                  {{ ledgerLabel }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <template #email>
          <form id="invite-form" class="space-y-4 pt-4" @submit.prevent="onSubmit">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-highlighted">Invite by email</p>
              <UBadge
                v-if="readyCount"
                color="primary"
                variant="subtle"
                :label="`${readyCount} ready to send`"
                class="rounded-full"
              />
            </div>

            <div class="space-y-2">
              <div v-for="row in emails" :key="row.id" class="flex items-start gap-2">
                <UFormField :error="rowError(row.email)" class="min-w-0 flex-1">
                  <UInput
                    v-model="row.email"
                    type="email"
                    icon="i-lucide-mail"
                    placeholder="name@example.com"
                    size="lg"
                    autocomplete="off"
                    :ui="{ root: 'w-full', base: 'font-mono text-xs' }"
                  >
                    <template v-if="isValidEmail(row.email)" #trailing>
                      <UIcon name="i-lucide-circle-check" class="text-success" />
                    </template>
                  </UInput>
                </UFormField>
                <UButton
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  aria-label="Remove email"
                  :disabled="emails.length === 1 && !row.email"
                  @click="removeEmail(row.id)"
                />
              </div>
            </div>

            <UButton
              color="primary"
              variant="soft"
              icon="i-lucide-plus"
              label="Add another email"
              :disabled="emails.length >= 20"
              @click="addEmail"
            />

            <div class="space-y-1.5 rounded-xl border border-default bg-elevated/40 p-3 text-sm">
              <div class="flex items-center justify-between gap-3 text-muted">
                <span>Role on join</span>
                <span class="font-medium text-highlighted">Member</span>
              </div>
              <div class="flex items-center justify-between gap-3 text-muted">
                <span>Invite expires</span>
                <span class="font-mono text-highlighted">7 days</span>
              </div>
            </div>
          </form>
        </template>
      </UTabs>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="submitting"
          :block="!isMD"
          @click="close"
        />
        <UButton
          v-if="tab === 'email'"
          type="submit"
          form="invite-form"
          icon="i-lucide-send"
          :label="sendLabel"
          :block="!isMD"
          :loading="submitting"
          :disabled="readyCount === 0 || hasInvalid"
        />
        <UButton v-else label="Done" :block="!isMD" @click="close" />
      </div>
    </template>
  </Panel>
</template>
