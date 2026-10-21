<script lang="ts">
import type { DrawerProps, ModalProps, ModalSlots } from "@nuxt/ui";

type SharedOverlayProps = "title" | "description" | "open" | "defaultOpen";

export interface PanelProps {
  title?: ModalProps["title"];
  description?: ModalProps["description"];
  modal?: Partial<Omit<ModalProps, SharedOverlayProps>>;
  drawer?: Partial<Omit<DrawerProps, SharedOverlayProps>>;
}

export interface PanelSlots {
  default?: ModalSlots["default"];
  body?: ModalSlots["body"];
  footer?: ModalSlots["footer"];
}
</script>

<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const props = defineProps<PanelProps>();

defineSlots<PanelSlots>();

const { isMD } = useBreakpoints();
const UModal = resolveComponent("UModal");
const UDrawer = resolveComponent("UDrawer");

const overlay = computed(() => (isMD.value ? UModal : UDrawer));
const overlayProps = computed<Partial<ModalProps> | Partial<DrawerProps>>(() => {
  if (isMD.value) return props.modal ?? {};
  return {
    handleOnly: true,
    fixed: true,
    close: false,
    ...props.drawer,
  };
});

function close() {
  open.value = false;
}
</script>

<template>
  <component
    :is="overlay"
    v-model:open="open"
    :title="title"
    :description="description"
    v-bind="overlayProps"
  >
    <template v-if="$slots.default" #default="slotProps">
      <slot v-bind="slotProps" />
    </template>

    <template v-if="$slots.body" #body>
      <slot name="body" :close="close" />
    </template>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" :close="close" />
    </template>
  </component>
</template>
