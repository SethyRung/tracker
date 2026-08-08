import dayjs from "#build/dayjs.imports.mjs";
import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin(() => {
  return {
    provide: { dayjs },
  };
});
