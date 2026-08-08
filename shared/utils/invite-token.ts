// Invite-link tokens. Format: 8-char base62 string (A-Z, a-z, 0-9),
// easy to type, hard to guess (62^8 ≈ 2.18×10^14 combinations).
//
// Per MOCKS.md: "Invite token format: 8-char base62 (`k7Qp2m`)".
// Store only the SHA-256 of the token; raw token is sent in the URL
// and never persisted.

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
