export interface ActiveMember {
  id: string;
  joinedAt: Date;
}

export function pickNextAdmin(members: readonly ActiveMember[]): ActiveMember | null {
  if (members.length === 0) return null;
  let oldest = members[0]!;
  for (let i = 1; i < members.length; i++) {
    const m = members[i]!;
    if (m.joinedAt.getTime() < oldest.joinedAt.getTime()) {
      oldest = m;
    }
  }
  return oldest;
}
