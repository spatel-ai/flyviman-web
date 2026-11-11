import { describe, expect, it } from "vitest";
import { activeHref } from "./nav-links";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/operators", label: "Operators" },
  { href: "/admin/users", label: "Users" },
];

describe("activeHref", () => {
  it("marks the exact page", () => {
    expect(activeHref("/admin", ITEMS)).toBe("/admin");
    expect(activeHref("/admin/users", ITEMS)).toBe("/admin/users");
  });

  it("marks the section for a page inside it, not the dashboard", () => {
    expect(activeHref("/admin/operators/123", ITEMS)).toBe("/admin/operators");
  });

  it("does not match a path that merely starts with the same letters", () => {
    expect(activeHref("/administrator", ITEMS)).toBeNull();
  });
});
