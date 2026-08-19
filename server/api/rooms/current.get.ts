export default defineEventHandler(async (event) => {
  const room = await getActiveRoom(event);
  return createResponse({ code: ApiResponseCode.Success }, room);
});
