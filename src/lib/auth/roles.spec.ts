import { describe, expect, it } from "vitest";
import { destinationAfterLogin, homeFor, surfaceFor, surfaceOf } from "./roles";

describe("roles", () => {
  it("sends each role to its own surface", () => {
    expect(homeFor("CUSTOMER")).toBe("/");
    expect(homeFor("OPERATOR_ADMIN")).toBe("/operator");
    expect(homeFor("OPERATOR_STAFF")).toBe("/operator");
    expect(homeFor("OPS")).toBe("/admin");
    expect(homeFor("FINANCE_ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
    expect(surfaceFor("SUPER_ADMIN")).toBe("admin");
  });

  it("recognises which surface a path belongs to", () => {
    expect(surfaceOf("/admin")).toBe("admin");
    expect(surfaceOf("/admin/operators/1")).toBe("admin");
    expect(surfaceOf("/administrator")).toBe("customer");
    expect(surfaceOf("/operator/onboarding")).toBe("operator");
    expect(surfaceOf("/account/passengers")).toBe("customer");
  });

  describe("destinationAfterLogin", () => {
    it("returns to the page the user was heading for", () => {
      expect(
        destinationAfterLogin(
          "SUPER_ADMIN",
          "/admin/operators?status=PENDING_REVIEW",
        ),
      ).toBe("/admin/operators?status=PENDING_REVIEW");
      expect(destinationAfterLogin("CUSTOMER", "/account/passengers")).toBe(
        "/account/passengers",
      );
    });

    it("ignores a page on another surface", () => {
      expect(destinationAfterLogin("CUSTOMER", "/admin")).toBe("/");
      expect(destinationAfterLogin("OPS", "/operator")).toBe("/admin");
      expect(destinationAfterLogin("OPERATOR_ADMIN", "/account")).toBe(
        "/operator",
      );
    });

    it.each([
      "https://evil.example/admin",
      "//evil.example/admin",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example/admin",
      "/ /evil.example",
      "/\\/evil.example/admin",
      "javascript:alert(1)",
      "admin",
      "",
    ])("ignores %j, which could lead off-site", (next) => {
      expect(destinationAfterLogin("SUPER_ADMIN", next)).toBe("/admin");
    });

    it("falls back to home when there is nowhere to return to", () => {
      expect(destinationAfterLogin("OPS", null)).toBe("/admin");
      expect(destinationAfterLogin("CUSTOMER")).toBe("/");
    });
  });
});
