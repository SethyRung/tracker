import { z } from "zod";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  try {
    await serverAuth().api.changePassword({
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        revokeOtherSessions: true,
      },
      headers: event.headers,
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Could not change password.";
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message,
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, { signedOut: true });
});
