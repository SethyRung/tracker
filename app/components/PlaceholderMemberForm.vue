<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ApiResponse } from "#shared/types/response";
import { MEMBER_COLORS } from "#shared/types/member-color";
import { normalizePhone } from "#shared/utils/contact";

const props = defineProps<{
  roomId: string;
  member?: {
    id: string;
    nickname: string | null;
    email: string;
    contactPhone: string | null;
    color: string | null;
  } | null;
}>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ refresh: [] }>();
const toast = useToast();
const saving = ref(false);
const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || !!normalizePhone(value), "Use an international phone number"),
  color: z.string(),
});
const state = reactive({ name: "", email: "", phone: "", color: "" });

watch(open, (isOpen) => {
  if (!isOpen) return;
  state.name = props.member?.nickname ?? "";
  state.email = props.member?.email ?? "";
  state.phone = props.member?.contactPhone ?? "";
  state.color = props.member?.color ?? "";
});

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  if (saving.value) return;
  saving.value = true;
  const { name, email, phone, color } = event.data;
  try {
    const result = props.member
      ? await $fetch<ApiResponse<unknown>>(
          `/api/rooms/${props.roomId}/members/${props.member.id}`,
          {
            method: "PATCH",
            body: {
              nickname: name,
              contactEmail: email || null,
              contactPhone: phone || null,
              ...(color ? { color } : {}),
            },
          },
        )
      : await $fetch<ApiResponse<unknown>>(`/api/rooms/${props.roomId}/members`, {
          method: "POST",
          body: { name, email, phone, ...(color ? { color } : {}) },
        });
    if (!isSuccessResponse(result)) throw new Error(result.status.message);
    open.value = false;
    emit("refresh");
    toast.add({
      title: props.member ? "Roommate updated" : "Roommate added",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Could not save roommate",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Panel
    v-model:open="open"
    :title="member ? 'Edit roommate' : 'Add roommate'"
    description="Add someone now; they can join the room later."
  >
    <template #body>
      <UForm
        id="placeholder-member-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name" required
          ><UInput v-model="state.name" class="w-full" autofocus
        /></UFormField>
        <UFormField label="Email" name="email" hint="Optional"
          ><UInput v-model="state.email" type="email" class="w-full"
        /></UFormField>
        <UFormField
          label="Phone"
          name="phone"
          hint="Optional"
          description="Include the country code, for example +855."
          ><UInput v-model="state.phone" type="tel" class="w-full"
        /></UFormField>
        <UFormField label="Color" name="color" hint="Optional">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in MEMBER_COLORS"
              :key="color"
              type="button"
              class="size-7 rounded-full border border-default"
              :class="{
                'ring-2 ring-primary ring-offset-2 ring-offset-default': state.color === color,
              }"
              :style="{ backgroundColor: color }"
              :aria-label="`Use accent color ${color}`"
              :aria-pressed="state.color === color"
              @click="state.color = color"
            />
          </div>
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="ghost" @click="close" /><UButton
          type="submit"
          form="placeholder-member-form"
          label="Save"
          :loading="saving"
        />
      </div>
    </template>
  </Panel>
</template>
