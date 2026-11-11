import { describe, expect, it } from "vitest";
import { STAFF_ROLE_OPTIONS, staffSchema } from "./staff-schema";

function issues(input: unknown): Record<string, string> {
  const result = staffSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("staffSchema", () => {
  it("accepts an email and an internal role, trimming the email", () => {
    expect(
      staffSchema.parse({ email: " ops.lead@flyviman.com ", role: "OPS" }),
    ).toEqual({ email: "ops.lead@flyviman.com", role: "OPS" });
  });

  it.each(["OPS", "FINANCE_ADMIN", "SUPER_ADMIN"])("accepts %s", (role) => {
    expect(staffSchema.safeParse({ email: "a@b.co", role }).success).toBe(true);
  });

  it.each(["CUSTOMER", "OPERATOR_ADMIN", "OPERATOR_STAFF", "", undefined])(
    "refuses the role %s",
    (role) => {
      expect(issues({ email: "a@b.co", role })).toEqual({
        role: "Choose a role.",
      });
    },
  );

  it.each(["", "not-an-email", `${"a".repeat(250)}@b.co`])(
    "refuses the email %s",
    (email) => {
      expect(issues({ email, role: "OPS" })).toEqual({
        email: "Enter a valid email address.",
      });
    },
  );

  it("labels the roles as the rest of the portal does", () => {
    expect(STAFF_ROLE_OPTIONS).toEqual([
      { value: "OPS", label: "Operations" },
      { value: "FINANCE_ADMIN", label: "Finance" },
      { value: "SUPER_ADMIN", label: "Super administrator" },
    ]);
  });
});
