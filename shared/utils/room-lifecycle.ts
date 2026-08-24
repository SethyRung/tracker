export function isRoomActive(room: { deletedAt: Date | null }): boolean {
  return room.deletedAt == null;
}

export function canDeleteRoom(
  activeMembers: readonly { id: string }[],
  callerMembershipId: string,
): boolean {
  return activeMembers.length === 1 && activeMembers[0]?.id === callerMembershipId;
}

export function wasArchivedByRoomDelete(
  membership: { leftAt: Date | null },
  roomDeletedAt: Date | null,
  toleranceMs: number,
): boolean {
  if (membership.leftAt == null || roomDeletedAt == null) return false;
  return Math.abs(membership.leftAt.getTime() - roomDeletedAt.getTime()) <= toleranceMs;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isPurgeEligible(
  room: { deletedAt: Date | null },
  now: Date,
  days: number,
): boolean {
  if (room.deletedAt == null) return false;
  return now.getTime() - room.deletedAt.getTime() > days * MS_PER_DAY;
}
