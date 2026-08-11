import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { entries } from "hub:db:schema";
import { ApiResponseCode, type ApiResponse } from "#shared/types/response";

interface EntryShape {
  id: string;
  roomId: string;
  status: "draft" | "published";
  categoryId: string | null;
  currency: "USD" | "KHR";
  amountMinor: number;
  date: Date;
  paidByMembershipId: string;
  notes: string | null;
  templateId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface PublishEntryResponse {
  entry: EntryShape;
}

export default defineEventHandler(async (event): Promise<ApiResponse<PublishEntryResponse>> => {
  const roomId = getRouterParam(event, "id");
  const eid = getRouterParam(event, "eid");
  if (!roomId || !eid) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Missing id",
    });
  }

  const ctx = await requireRoomContext(event, roomId);

  const current = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, eid), eq(entries.roomId, roomId)))
    .limit(1);
  if (current.length === 0) {
    return createResponse({
      code: ApiResponseCode.NotFound,
      message: "Entry not found",
    });
  }
  const entry = current[0]!;

  // Publish is admin-only and only meaningful for drafts (recurring-template
  // materializations). User entries are already published on create.
  if (ctx.role !== "admin") {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "Only an admin can publish a draft entry.",
    });
  }
  if (entry.status === "published") {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "This entry is already published.",
    });
  }

  await db
    .update(entries)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(entries.id, eid));

  const updated = await db.select().from(entries).where(eq(entries.id, eid)).limit(1);
  return createResponse({ code: ApiResponseCode.Success }, { entry: updated[0]! });
});