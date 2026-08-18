declare module "#nuxt-better-auth" {
  interface AuthUser {
    roomId: string | null;
    role: "admin" | "member" | null;
  }
}

export {};
