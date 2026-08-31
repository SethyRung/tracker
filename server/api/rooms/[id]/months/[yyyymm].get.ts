export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const yyyymm = getMonthKeyParam(event);
  if (!isValidMonthKey(yyyymm)) {
    return invalidMonthKeyResponse(yyyymm);
  }

  await requireRoomContext(event, roomId);

  const snapshot = await getMonthSnapshot(roomId, yyyymm);
  const result = snapshot ?? {
    id: null,
    roomId,
    yyyymm,
    status: "open" as const,
    closedAt: null,
    closedByUserId: null,
  };

  return createResponse({ code: ApiResponseCode.Success }, result);
});
