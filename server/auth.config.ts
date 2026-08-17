import { defineServerAuth } from "@onmax/nuxt-better-auth/config";
import { customSession } from "better-auth/plugins";
import { and, asc, eq } from "drizzle-orm";

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
  plugins: [
    /**
     * Augment a Better Auth session payload with the user's active `roomId`.
     *
     * Resolves the user's active room fresh on every call so that a recently
     * joined/left room is reflected immediately, regardless of session cookie
     * cache TTL.
     */
    customSession(async (sessionData) => {
      const { db } = await import("hub:db");
      const { roomMemberships, rooms } = await import("hub:db:schema");

      const rows = await db
        .select({ id: rooms.id })
        .from(roomMemberships)
        .innerJoin(rooms, eq(rooms.id, roomMemberships.roomId))
        .where(
          and(eq(roomMemberships.userId, sessionData.user.id), eq(roomMemberships.isActive, true)),
        )
        .orderBy(asc(roomMemberships.joinedAt))
        .limit(1);

      return {
        ...sessionData,
        user: { ...sessionData.user, roomId: rows[0]?.id ?? null },
      };
    }),
  ],
});
