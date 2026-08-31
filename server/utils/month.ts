import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";

export async function getMonthSnapshot(roomId: string, yyyymm: string) {
  if (!isValidMonthKey(yyyymm)) {
    throw new Error(`Invalid month key: ${yyyymm}`);
  }
  const rows = await db
    .select()
    .from(schema.monthSnapshots)
    .where(and(eq(schema.monthSnapshots.roomId, roomId), eq(schema.monthSnapshots.yyyymm, yyyymm)))
    .limit(1);
  return rows[0] ?? null;
}

export async function isMonthClosed(roomId: string, yyyymm: string): Promise<boolean> {
  const snapshot = await getMonthSnapshot(roomId, yyyymm);
  return snapshot?.status === "closed";
}

export function invalidMonthKeyResponse(yyyymm: string) {
  return createResponse({
    code: ApiResponseCode.InvalidRequest,
    message: `Invalid month key: ${yyyymm}`,
  });
}

export async function closedMonthResponse(roomId: string, yyyymm: string) {
  if (!(await isMonthClosed(roomId, yyyymm))) return null;
  return createResponse({
    code: ApiResponseCode.InvalidRequest,
    message: `Month ${yyyymm} is closed — reopen it before making changes.`,
  });
}
