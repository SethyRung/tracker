import { z } from "zod";

const bodySchema = z.object({
  currentPassword: z.string("Current password is required").min(1, "Current password is required"),
  newPassword: z
    .string("New password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
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
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: getErrorMessage(error, "Could not change password."),
    });
  }

  return createResponse({ code: ApiResponseCode.Success }, { signedOut: true });
});
