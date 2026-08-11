import { and, eq } from "drizzle-orm";
import { db } from "hub:db";
import { entries } from "hub:db:schema";
import { ApiResponseCode, type ApiResponse } from "#shared/types/response";

interface EntryShape {
  id: string;
  roomId: string;
  status: "draft" | "published";
  createdByUserId: string;
}

function canMutate(entry: EntryShape, isAdmin: boolean, isOwner: boolean) {
  if (isAdmin) return true;
  if (entry.status === "published") return isOwner;
  return false;
}

export default defineEventHandler(async (event): Promise<ApiResponse<{ ok: true }>> => {
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

  const isAdmin = ctx.role === "admin";
  const isOwner = entry.createdByUserId === ctx.userId;
  if (!canMutate(entry, isAdmin, isOwner)) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message:
        entry.status === "draft"
          ? "Only an admin can delete a draft entry."
          : "Only the creator or an admin can delete this entry.",
    });
  }

  await db.delete(entries).where(eq(entries.id, eid));
  return createResponse({ code: ApiResponseCode.Success }, { ok: true });
});