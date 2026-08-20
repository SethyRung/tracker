export function useLastRoomId() {
  return useCookie<string>("lastRoomId", {
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
