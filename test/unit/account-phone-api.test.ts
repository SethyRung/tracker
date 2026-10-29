import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiResponseCode } from "../../shared/types/response";

const auth = vi.hoisted(() => ({ profile: { name: "Sokha", phone: null as string | null } }));

let update: typeof import("../../server/api/account/index.patch").default;

beforeAll(async () => {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("requireUserSession", async () => ({ user: { id: "user-a" } }));
  vi.stubGlobal(
    "readValidatedBody",
    (event: { body: unknown }, parse: (body: unknown) => unknown) => parse(event.body),
  );
  vi.stubGlobal("serverAuth", () => ({
    api: {
      updateUser: async ({ body }: { body: typeof auth.profile }) =>
        Object.assign(auth.profile, body),
    },
  }));
  vi.stubGlobal("refreshSessionCookieCache", async () => {});
  vi.stubGlobal("ApiResponseCode", ApiResponseCode);
  vi.stubGlobal("createResponse", (status: unknown, data?: unknown) => ({ status, data }));
  update = (await import("../../server/api/account/index.patch")).default;
});

afterAll(() => vi.unstubAllGlobals());

describe("account phone", () => {
  it("allows an existing user to save an international phone number", async () => {
    const response = await update({ body: { name: "Sokha", phone: "+855 12 345 678" } } as never);
    expect(response.status.code).toBe(ApiResponseCode.Success);
    expect(response.data).toMatchObject({ name: "Sokha", phone: "+85512345678" });
  });
});
