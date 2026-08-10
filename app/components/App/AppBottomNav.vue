<script setup lang="ts">
const route = useRoute();

const navItems = computed(() => {
  const isActive = (path: string) => route.path === path || route.path.startsWith(path + "/");
  return [
    {
      label: "Home",
      value: "/dashboard",
      icon: "i-lucide-house",
      active: isActive("/dashboard"),
    },
    {
      label: "People",
      value: "/members",
      icon: "i-lucide-users",
      active: isActive("/members"),
    },
    {
      label: "Settle",
      value: `/settle/${currentMonth()}`,
      icon: "i-lucide-scale",
      active: isActive("/settle"),
    },
  ];
});

const activeValue = computed(() => navItems.value.find((n) => n.active)?.value);

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function onUpdate(value: string | number) {
  if (typeof value === "string") await navigateTo(value);
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-30 bg-default border-t border-default">
    <UTabs
      :model-value="activeValue"
      :items="navItems"
      :content="false"
      variant="link"
      :ui="{
        root: 'w-full',
        list: 'flex items-center justify-around max-w-2xl mx-auto',
        trigger: 'flex-col gap-1 py-2 px-4 rounded-lg data-[state=active]:text-primary',
        leadingIcon: 'size-5',
        label: 'text-xs font-medium',
      }"
      @update:model-value="onUpdate"
    />
  </nav>
</template>
