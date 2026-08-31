export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const eid = getEntryId(event);

  await requireRoomContext(event, roomId);

  const entry = await findRoomEntry(roomId, eid);
  if (!entry) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }

  const weights = await findEntryWeights(eid);

  return createResponse({ code: ApiResponseCode.Success }, { ...entry, weights });
});
