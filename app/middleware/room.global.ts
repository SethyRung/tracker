export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== "/") return;

  const { loggedIn } = useUserSession();
  if (!loggedIn.value) return;

  try {
    const res = await $fetch("/api/rooms");
    if (isSuccessResponse(res)) {
      return navigateTo(resolveRoomLanding(res.data));
    }
  } catch {
    // fetch error — fall through to the chooser
  }

  return navigateTo("/rooms");
});
