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
      const res = await $fetch("/api/rooms/current");
      if (isSuccessResponse(res) && !res.data.room) {
        return navigateTo("/onboarding/room");
      }
    } catch {
      return;
    }
  }
});
