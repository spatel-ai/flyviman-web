import { describe, expect, it } from "vitest";
import {
  inviteSchema,
  permissionsBody,
  permissionsSchema,
} from "./staff-schema";

const A = "0b8f6a3e-6f2d-4b4a-9a1e-2f1d3c4b5a61";

describe("staff permissions", () => {
  it("needs a permission and an aircraft or all aircraft", () => {
    expect(
      permissionsSchema.safeParse({
        capabilities: [],
        allAircraft: true,
        aircraftIds: [],
      }).success,
    ).toBe(false);
    const noAircraft = permissionsSchema.safeParse({
      capabilities: ["MANAGE_AIRCRAFT"],
      allAircraft: false,
      aircraftIds: [],
    });
    expect(noAircraft.success).toBe(false);
    expect(noAircraft.error?.issues[0].path).toEqual(["aircraftIds"]);
    expect(
      permissionsSchema.safeParse({
        capabilities: ["MANAGE_AVAILABILITY"],
        allAircraft: false,
        aircraftIds: [A],
      }).success,
    ).toBe(true);
  });

  it("trims and checks the email", () => {
    const parsed = inviteSchema.safeParse({
      email: "  dispatch@example.com ",
      capabilities: ["MANAGE_AIRCRAFT"],
      allAircraft: true,
      aircraftIds: [],
    });
    expect(parsed.success && parsed.data.email).toBe("dispatch@example.com");
    expect(
      inviteSchema.safeParse({
        email: "not-an-email",
        capabilities: ["MANAGE_AIRCRAFT"],
        allAircraft: true,
        aircraftIds: [],
      }).success,
    ).toBe(false);
  });

  it("sends no aircraft list with all aircraft", () => {
    expect(
      permissionsBody({
        capabilities: ["MANAGE_AIRCRAFT"],
        allAircraft: true,
        aircraftIds: [A],
      }).aircraftIds,
    ).toEqual([]);
  });
});
