const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/reset-password", "/forgot-password"];

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === "/" || PUBLIC_PREFIXES.some((p) => to.path.startsWith(p))) {
    return;
  }
});
