import { getRouterParam, type H3Event } from "h3";

export function getRoomId(event: H3Event): string {
  const roomId = getRouterParam(event, "id");
  if (!roomId) {
    throw createError({ statusCode: 400, statusMessage: "Missing room id" });
  }
  return roomId;
}
