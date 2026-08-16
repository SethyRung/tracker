export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing room id",
    });
  }

  const ctx = await requireRoomAdmin(event, roomId);
  const { joinUrl, expiresAt } = await createInviteLink(ctx.membership.id, roomId);

  return createResponse({ code: ApiResponseCode.Success }, { joinUrl, expiresAt });
});
