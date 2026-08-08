<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({
  auth: { only: "user" },
});

useHead({ title: "Create room · Tricker" });

const schema = z.object({
  name: z.string().min(1, "Room name is required").max(80),
  usdEnabled: z.boolean().default(true),
  khrEnabled: z.boolean().default(true),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: "",
  usdEnabled: true,
  khrEnabled: true,
});

const submitting = ref(false);
const error = ref<string | null>(null);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;
  error.value = null;
  try {
    const res = await $fetch<{ room: { id: string } }>("/api/rooms", {
      method: "POST",
      body: event.data,
    });
    await navigateTo(`/dashboard?roomId=${res.room.id}`);
  } catch (e) {
    error.value = (e as { statusMessage?: string })?.statusMessage ?? "Could not create room.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-lg">
    <header class="mb-6">
      <NuxtLink to="/onboarding/room" class="text-sm text-toned hover:text-primary">
        ← Back
      </NuxtLink>
      <h1 class="font-pixel-circle text-2xl text-primary mt-2">Create a room</h1>
      <p class="text-toned mt-1">Pick a name for your household ledger.</p>
    </header>

    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField name="name" label="Room name" required>
        <UInput
          v-model="state.name"
          placeholder="e.g. Seth's Place"
          size="lg"
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <UFormField name="currencies" label="Currencies">
        <div class="flex gap-3">
          <UCheckbox v-model="state.usdEnabled" label="USD" />
          <UCheckbox v-model="state.khrEnabled" label="KHR" />
        </div>
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="error"
        icon="i-lucide-alert-circle"
      />

      <UButton
        type="submit"
        label="Create room"
        size="lg"
        block
        :loading="submitting"
        :disabled="submitting"
      />
    </UForm>
  </UContainer>
</template>
