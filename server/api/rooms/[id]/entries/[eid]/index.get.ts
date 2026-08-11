import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { entries, entryWeights } from "hub:db:schema";
import { ApiResponseCode, type ApiResponse } from "#shared/types/response";

interface EntryShape {
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
interface EntryWithWeights extends EntryShape {
  weights: { entryId: string; membershipId: string; weightBps: number }[];
}
interface GetEntryResponse {
  entry: EntryWithWeights;
}

export default defineEventHandler(async (event): Promise<ApiResponse<GetEntryResponse>> => {
  const roomId = getRouterParam(event, "id");
  const eid = getRouterParam(event, "eid");
  if (!roomId || !eid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  await requireRoomContext(event, roomId);

  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, eid), eq(entries.roomId, roomId)))
    .limit(1);
  if (rows.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }

  const weights = await db.select().from(entryWeights).where(eq(entryWeights.entryId, eid));
  const entry = { ...rows[0], weights } as EntryWithWeights;
  return createResponse({ code: ApiResponseCode.Success }, { entry });
});
