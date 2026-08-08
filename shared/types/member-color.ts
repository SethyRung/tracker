export const MEMBER_COLORS = [
  "#10b981",
  "#a855f7",
  "#3b82f6",
  "#f97316",
  "#eab308",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

export function isValidMemberColor(value: unknown): value is MemberColor {
  return typeof value === "string" && (MEMBER_COLORS as readonly string[]).includes(value);
}

export function nextMemberColor(usedColors: readonly string[]): MemberColor {
  for (const c of MEMBER_COLORS) {
    if (!usedColors.includes(c)) return c;
  }
  return MEMBER_COLORS[0];
}
