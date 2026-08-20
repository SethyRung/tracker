import { describe, expect, it } from "vitest";
import { resolveRoomLanding } from "../../shared/utils/room-landing";

const ms = (id: string) => ({ id });

describe("resolveRoomLanding", () => {
  it("routes to the chooser when there are no memberships", () => {
    expect(resolveRoomLanding([])).toBe("/rooms");
  });

  it("routes straight to the only room's dashboard when there is exactly one membership", () => {
    expect(resolveRoomLanding([ms("r1")])).toBe("/rooms/r1/dashboard");
  });

  it("routes to the chooser when there are multiple memberships", () => {
    expect(resolveRoomLanding([ms("r1"), ms("r2")])).toBe("/rooms");
  });

  it("routes to the chooser for many memberships", () => {
    expect(resolveRoomLanding([ms("r1"), ms("r2"), ms("r3")])).toBe("/rooms");
  });
});
