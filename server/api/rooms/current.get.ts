export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const room = await getActiveRoomForUser(session.user.id);
  return { room: room ?? null };
});