// Admin succession logic — pure, testable in isolation.
//
// SPEC §5: "if the only admin leaves/is removed, the oldest active
// member (by joined_at) is auto-promoted to admin. Multiple admins
// not allowed."

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
