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

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["better-auth/client/plugins"],
    },
  },

  hub: {
    db: {
      dialect: "postgresql",
      driver: process.env.DATABASE_DRIVER as any,
      casing: "snake_case",
    },
  },

  auth: {
    schema: {
      casing: "snake_case",
    },
    redirects: {
      login: "/sign-in",
      guest: "/",
      authenticated: "/dashboard",
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
});
