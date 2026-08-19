export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const yyyymm = getRouterParam(event, "yyyymm");
  if (!yyyymm) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  if (!isValidMonthKey(yyyymm)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: `Invalid month key: ${yyyymm}`,
    });
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
