import { describe, expect, it } from "vitest";
import { can, operatorNav, type OperatorAccess } from "./operator-access";

const A = "0b8f6a3e-6f2d-4b4a-9a1e-2f1d3c4b5a61";
const B = "7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";

const admin: OperatorAccess = {
  role: "OPERATOR_ADMIN",
  capabilities: ["MANAGE_AIRCRAFT", "MANAGE_AVAILABILITY"],
  allAircraft: true,
  aircraftIds: [],
};
const availabilityStaff: OperatorAccess = {
  role: "OPERATOR_STAFF",
  capabilities: ["MANAGE_AVAILABILITY"],
  allAircraft: false,
  aircraftIds: [A],
};

const hrefs = (links: { href: string }[]) => links.map((link) => link.href);

describe("can", () => {
  it("is false while loading", () => {
    expect(can(undefined, "MANAGE_AIRCRAFT")).toBe(false);
  });

  it("checks the capability and the aircraft", () => {
    expect(can(availabilityStaff, "MANAGE_AVAILABILITY", A)).toBe(true);
    expect(can(availabilityStaff, "MANAGE_AVAILABILITY", B)).toBe(false);
    expect(can(availabilityStaff, "MANAGE_AIRCRAFT", A)).toBe(false);
    expect(can(admin, "MANAGE_AIRCRAFT", B)).toBe(true);
  });
});

describe("operatorNav", () => {
  it("offers administrators the whole portal once approved", () => {
    expect(hrefs(operatorNav("APPROVED", admin))).toEqual([
      "/operator",
      "/operator/aircraft",
      "/operator/availability",
      "/operator/team",
      "/operator/onboarding",
    ]);
  });

  it("offers only the application before approval", () => {
    expect(hrefs(operatorNav("PENDING_REVIEW", admin))).toEqual([
      "/operator/onboarding",
    ]);
  });

  it("keeps the fleet for a suspended operator", () => {
    expect(hrefs(operatorNav("SUSPENDED", admin))).not.toContain("/operator");
    expect(hrefs(operatorNav("SUSPENDED", admin))).toContain(
      "/operator/aircraft",
    );
  });

  it("shows staff only what their permissions cover", () => {
    expect(hrefs(operatorNav("APPROVED", availabilityStaff))).toEqual([
      "/operator",
      "/operator/aircraft",
      "/operator/availability",
    ]);
    const aircraftStaff: OperatorAccess = {
      ...availabilityStaff,
      capabilities: ["MANAGE_AIRCRAFT"],
    };
    expect(hrefs(operatorNav("APPROVED", aircraftStaff))).toEqual([
      "/operator",
      "/operator/aircraft",
    ]);
    expect(hrefs(operatorNav("DRAFT", availabilityStaff))).toEqual([]);
  });
});
