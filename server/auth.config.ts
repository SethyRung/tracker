import { APIError, createAuthMiddleware } from "better-auth/api";
import { defineServerAuth } from "@nuxtjs/better-auth/config";
import { normalizePhone } from "../shared/utils/contact";

export default defineServerAuth({
  user: {
    additionalFields: { phone: { type: "string", required: false } },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" && ctx.path !== "/update-user") return;

      const body = ctx.body;
      const phoneInput =
        body && typeof body === "object" && "phone" in body ? body.phone : undefined;
      const phone = typeof phoneInput === "string" ? normalizePhone(phoneInput) : null;
      if (
        (ctx.path === "/sign-up/email" || (phoneInput !== undefined && phoneInput !== null)) &&
        !phone
      ) {
        throw new APIError("BAD_REQUEST", { message: "Use a valid international phone number" });
      }
      if (ctx.path === "/update-user") {
        return phoneInput !== undefined ? { context: { body: { ...body, phone } } } : undefined;
      }
      const name =
        body && typeof body === "object" && "name" in body && typeof body.name === "string"
          ? body.name.trim()
          : "";
      if (!name) {
        throw new APIError("BAD_REQUEST", { message: "Name is required" });
      }

      return {
        context: {
          body: { ...body, name, phone },
        },
      };
    }),
  },
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
});
