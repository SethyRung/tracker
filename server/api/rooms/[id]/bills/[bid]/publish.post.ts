import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { bills } from "hub:db:schema";
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
interface PublishBillResponse {
  bill: BillShape;
  alreadyPublished: boolean;
}

export default defineEventHandler(async (event): Promise<ApiResponse<PublishBillResponse>> => {
  const roomId = getRouterParam(event, "id");
  const bid = getRouterParam(event, "bid");
  if (!roomId || !bid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  await requireRoomAdmin(event, roomId);

  const current = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, bid), eq(bills.roomId, roomId)))
    .limit(1);
  if (current.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Bill not found",
    });
  }
  if (current[0]!.status === "published") {
    return createResponse(
      { code: ApiResponseCode.Success },
      { bill: current[0] as BillShape, alreadyPublished: true },
    );
  }

  await db
    .update(bills)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(bills.id, bid));

  const updated = await db.select().from(bills).where(eq(bills.id, bid)).limit(1);
  return createResponse(
    { code: ApiResponseCode.Success },
    { bill: updated[0] as BillShape, alreadyPublished: false },
  );
});