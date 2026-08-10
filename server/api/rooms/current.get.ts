export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const fetched = await getActiveRoomForUser(session.user.id);
  return createResponse({ code: ApiResponseCode.Success }, { room: fetched });
});
