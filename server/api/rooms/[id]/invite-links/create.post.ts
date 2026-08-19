export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  const ctx = await requireRoomAdmin(event, roomId);
  const { joinUrl, expiresAt } = await createInviteLink(ctx.membership.id, roomId);

  return createResponse({ code: ApiResponseCode.Success }, { joinUrl, expiresAt });
});
