export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  const ctx = await requireRoomAdmin(event, roomId);
  const blocked = await unverifiedEmailResponse(
    event,
    "Verify your email before inviting roommates.",
  );
  if (blocked) return blocked;

  const { joinUrl, expiresAt } = await createInviteLink(ctx.membership.id, roomId);

  return createResponse({ code: ApiResponseCode.Success }, { joinUrl, expiresAt });
});
