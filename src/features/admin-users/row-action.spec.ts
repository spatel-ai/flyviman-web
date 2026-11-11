import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/api/types";
import { canManageUsers, rowAction } from "./row-action";

const admin = { id: "admin-1", role: "SUPER_ADMIN" as Role };

describe("rowAction", () => {
  it("lets a super administrator suspend an active user", () => {
    expect(rowAction({ id: "u1", status: "ACTIVE" }, admin)).toBe("suspend");
  });

  it("lets a super administrator reinstate a suspended user", () => {
    expect(rowAction({ id: "u1", status: "SUSPENDED" }, admin)).toBe(
      "reinstate",
    );
  });

  it("offers nothing for an account awaiting verification", () => {
    expect(
      rowAction({ id: "u1", status: "PENDING_VERIFICATION" }, admin),
    ).toBeNull();
  });

  it("offers nothing on the viewer's own row", () => {
    expect(rowAction({ id: "admin-1", status: "ACTIVE" }, admin)).toBeNull();
  });

  it.each<Role>(["OPS", "FINANCE_ADMIN", "CUSTOMER", "OPERATOR_ADMIN"])(
    "offers nothing to %s",
    (role) => {
      const viewer = { id: "v1", role };
      expect(rowAction({ id: "u1", status: "ACTIVE" }, viewer)).toBeNull();
      expect(rowAction({ id: "u1", status: "SUSPENDED" }, viewer)).toBeNull();
    },
  );

  it("offers nothing until the viewer is known", () => {
    expect(rowAction({ id: "u1", status: "ACTIVE" }, undefined)).toBeNull();
  });
});

describe("canManageUsers", () => {
  it("is true for super administrators only", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers({ id: "v1", role: "OPS" })).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });
});
