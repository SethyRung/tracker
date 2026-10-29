import { defineClientAuth } from "@nuxtjs/better-auth/config";
import { inferAdditionalFields } from "better-auth/client/plugins";

export default defineClientAuth({
  plugins: [
    inferAdditionalFields<{
      user: { additionalFields: { phone: { type: "string"; required: false } } };
    }>(),
  ],
});
