export function resolveRoomLanding(memberships: { id: string }[]): string {
  const only = memberships[0];
  if (memberships.length === 1 && only) return `/rooms/${only.id}/dashboard`;
  return "/rooms";
}
