const BASE62_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomBase62(length: number): string {
  if (length <= 0) return "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE62_ALPHABET[bytes[i]! % BASE62_ALPHABET.length];
  }
  return out;
}

export async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const INVITE_TOKEN_LENGTH = 8;

/**Accepts a raw invite token or a full invite URL (https://host/join/<token>). */
export function extractInviteToken(input: string): string {
  const s = input.trim();
  if (!s) return "";
  const idx = s.lastIndexOf("/join/");
  if (idx >= 0) {
    return (s.slice(idx + "/join/".length).split(/[?#]/)[0] ?? "").trim();
  }
  try {
    const seg = new URL(s).pathname.split("/").filter(Boolean).pop();
    if (seg) return seg;
  } catch {
    // not a URL — treat the trimmed input as a raw token
  }
  return s;
}
