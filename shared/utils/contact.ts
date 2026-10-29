export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+[1-9][0-9 ()-]*$/.test(trimmed)) return null;
  const normalized = `+${trimmed.slice(1).replace(/[ ()-]/g, "")}`;
  return /^\+[1-9]\d{6,14}$/.test(normalized) ? normalized : null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
