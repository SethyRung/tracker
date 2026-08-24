import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2026-08-01",

  css: ["~/assets/css/main.css"],

  modules: [
    "@nuxt/ui",
    "@vueuse/nuxt",
    "@nuxthub/core",
    "@onmax/nuxt-better-auth",
    "@nuxt/test-utils/module",
  ],

  icon: {
    clientBundle: { scan: true },
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["better-auth/client/plugins"],
    },
  },

  hub: {
    blob: true,
    db: {
      dialect: "postgresql",
      driver: process.env.DATABASE_DRIVER as any,
      casing: "snake_case",
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "0 17 * * *": ["recurring:materialize"],
      "0 18 * * *": ["rooms:purge"],
    },
  },

  auth: {
    schema: {
      casing: "snake_case",
    },
    redirects: {
      login: "/sign-in",
      guest: "/",
      authenticated: "/",
      logout: "/sign-in",
    },
  },

  fonts: {
    families: [
      { name: "Geist", provider: "local" },
      { name: "Geist Mono", provider: "local" },
      { name: "Geist Pixel", provider: "local" },
    ],
  },

  routeRules: {
    "/sign-in": { auth: "guest" },
    "/sign-up": { auth: "guest" },
    "/forgot-password": { auth: "guest" },
    "/reset-password": { auth: "guest" },
    "/account": { auth: "user" },
    "/onboarding/**": { auth: "user" },
    "/rooms/**": { auth: "user" },
    "/rooms": { auth: "user" },
    "/join/**": { auth: "user" },
  },

  runtimeConfig: {
    resend: {
      apiKey: "",
      fromEmail: "",
    },
  },
});
