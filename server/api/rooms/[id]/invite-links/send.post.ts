import { createInviteSchema } from "~~/shared/schemas/room";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  const ctx = await requireRoomAdmin(event, roomId);
  const { emails } = await readValidatedBody(event, createInviteSchema.parse);

  const { joinUrl } = await createInviteLink(ctx.membership.id, roomId);

  const responses = await Promise.all(
    emails.map(async (email) =>
      sendInviteEmail({
        to: email,
        url: joinUrl,
        roomName: ctx.room.name,
        inviterName: ctx.membership.displayName,
      }),
    ),
  );

  const results = responses.map((res, index) => {
    const email = emails[index] ?? "missing-email";
    if (!res || res.error || !res.data) {
      return { email, emailSent: false };
    }

    return { email, emailSent: true };
  });

  return createResponse({ code: ApiResponseCode.Success }, results);
});
