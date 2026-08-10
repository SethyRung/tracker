import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { billWeights, bills } from "hub:db:schema";
import { ApiResponseCode, type ApiResponse } from "#shared/types/response";

interface BillShape {
  id: string;
  roomId: string;
  categoryId: string | null;
  currency: "USD" | "KHR";
  amountMinor: number;
  date: Date;
  paidByMembershipId: string;
  notes: string | null;
  status: "draft" | "published";
  templateId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface BillWithWeights extends BillShape {
  weights: { billId: string; membershipId: string; weightBps: number }[];
}
interface GetBillResponse {
  bill: BillWithWeights;
}

export default defineEventHandler(async (event): Promise<ApiResponse<GetBillResponse>> => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  await requireRoomContext(event, roomId);

  const rows = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, bid), eq(bills.roomId, roomId)))
    .limit(1);
  if (rows.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Bill not found",
    });
  }

  const weights = await db.select().from(billWeights).where(eq(billWeights.billId, bid));
  const bill = { ...rows[0], weights } as BillWithWeights;
  return createResponse({ code: ApiResponseCode.Success }, { bill });
});