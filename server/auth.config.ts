import { defineServerAuth } from "@onmax/nuxt-better-auth/config";
import { customSession } from "better-auth/plugins";

export default defineServerAuth({
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendVerificationEmail({ to: user.email, name: user.name, url });
    },
  },
  plugins: [customSession(attachActiveRoom)],
});
