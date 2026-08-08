export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/onboarding/room" || to.path.startsWith("/onboarding/room/")) return;
  if (to.path.startsWith("/join/")) return;
  if (
    to.path.startsWith("/sign-") ||
    to.path.startsWith("/forgot-") ||
    to.path.startsWith("/reset-")
  ) {
    return;
  }
  if (to.path === "/" || to.path === "/dashboard") {
    const { loggedIn } = useUserSession();
    if (!loggedIn.value) return;
    try {
      const res = await $fetch<{ room: { id: string } | null }>("/api/rooms/current");
      if (!res.room) {
        return navigateTo("/onboarding/room");
      }
    } catch {
      return;
    }
  }
});
