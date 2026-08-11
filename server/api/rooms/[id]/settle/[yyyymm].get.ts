import { asc, eq } from "drizzle-orm";
import { db } from "hub:db";
import { roomMemberships } from "hub:db:schema";
import { isValidMonthKey } from "~~/shared/types/date";
import { settleRoom } from "~~/server/utils/settle";

// Settlement view (SPEC §10): balances + minimum-transfer plan per currency.
// Members can view their own settlement; admin sees the full plan.
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

  const [plans, memberRows] = await Promise.all([
    settleRoom({ roomId, yyyymm }),
    db
      .select({
        id: roomMemberships.id,
        displayName: roomMemberships.displayName,
        color: roomMemberships.color,
      })
      .from(roomMemberships)
      .where(eq(roomMemberships.roomId, roomId))
      .orderBy(asc(roomMemberships.joinedAt)),
  ]);

  return createResponse(
    { code: ApiResponseCode.Success },
    {
      yyyymm,
      members: memberRows,
      plans,
    },
  );
});
