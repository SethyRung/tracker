import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import serverAuthConfig from "../../server/auth.config";

function createAuth() {
  const config = serverAuthConfig({} as never);
  return betterAuth({
    ...config,
    baseURL: "http://localhost:3000",
    secret: "test-secret-at-least-thirty-two-characters-long",
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    emailVerification: { sendOnSignUp: false },
  });
}

function signUp(auth: ReturnType<typeof createAuth>, phone?: string) {
  return auth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        name: "Sokha",
        email: "sokha@example.com",
        password: "password123",
        ...(phone === undefined ? {} : { phone }),
      }),
    }),
  );
}

describe("phone number at sign-up", () => {
  it("rejects a sign-up without a phone number", async () => {
    expect((await signUp(createAuth())).status).toBe(400);
  });

  it("accepts and normalizes an international phone without verification", async () => {
    const response = await signUp(createAuth(), "+855 12 345 678");
    expect(response.status).toBe(200);
    expect((await response.json()).user.phone).toBe("+85512345678");
  });

  it("includes the phone in the authenticated session", async () => {
    const auth = createAuth();
    const response = await signUp(auth, "+85512345678");
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const session = await auth.handler(
      new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }),
    );
    expect((await session.json()).user.phone).toBe("+85512345678");
  });

  it("lets a signed-in user clear their phone number", async () => {
    const auth = createAuth();
    const signUpResponse = await signUp(auth, "+85512345678");
    const cookie = signUpResponse.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const update = await auth.handler(
      new Request("http://localhost:3000/api/auth/update-user", {
        method: "POST",
        headers: { cookie, "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ phone: null }),
      }),
    );
    expect(update.status).toBe(200);
    const session = await auth.handler(
      new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }),
    );
    expect((await session.json()).user.phone).toBeNull();
  });
});
