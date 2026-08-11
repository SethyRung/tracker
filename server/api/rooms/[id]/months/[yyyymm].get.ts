import { getMonthSnapshot } from "~~/server/utils/month";
import { isValidMonthKey } from "~~/shared/types/date";

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, "id");
  const yyyymm = getRouterParam(event, "yyyymm");
  if (!roomId || !yyyymm) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }
  if (!isValidMonthKey(yyyymm)) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: `Invalid month key: ${yyyymm}`,
    });
  }

  await requireRoomContext(event, roomId);

  // No snapshot row means the month is implicitly OPEN — return a virtual
  // snapshot so clients don't have to special-case missing rows.
  const snapshot = await getMonthSnapshot(roomId, yyyymm);
  const result = snapshot ?? {
    id: null,
    roomId,
    yyyymm,
    status: "open" as const,
    closedAt: null,
    closedByUserId: null,
  };

  return createResponse({ code: ApiResponseCode.Success }, { snapshot: result });
});
