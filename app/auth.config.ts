import { defineClientAuth } from "@onmax/nuxt-better-auth/config";
import { customSessionClient } from "better-auth/client/plugins";

export default defineClientAuth({
  plugins: [customSessionClient()],
});
