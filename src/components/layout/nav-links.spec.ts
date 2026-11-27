import { describe, expect, it } from "vitest";
import { activeHref, sectionsOf } from "./nav-links";

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

  it("marks nothing on a page the navigation does not list, not the dashboard", () => {
    expect(activeHref("/admin/payments", ITEMS)).toBeNull();
    expect(
      activeHref("/operator/empty-legs/new", [
        { href: "/operator", label: "Dashboard" },
        { href: "/operator/aircraft", label: "Fleet" },
      ]),
    ).toBeNull();
  });

  it("marks the nearest listed section for a page inside it", () => {
    expect(
      activeHref("/operator/aircraft/new", [
        { href: "/operator", label: "Dashboard" },
        { href: "/operator/aircraft", label: "Fleet" },
      ]),
    ).toBe("/operator/aircraft");
  });

  it("does not match a path that merely starts with the same letters", () => {
    expect(activeHref("/administrator", ITEMS)).toBeNull();
  });
});

describe("sectionsOf", () => {
  it("keeps the order and starts a section where the group changes", () => {
    const sections = sectionsOf([
      { href: "/a", label: "A" },
      { href: "/b", label: "B", group: "One" },
      { href: "/c", label: "C", group: "One" },
      { href: "/d", label: "D", group: "Two" },
    ]);
    expect(sections.map((s) => [s.group, s.items.length])).toEqual([
      [undefined, 1],
      ["One", 2],
      ["Two", 1],
    ]);
  });

  it("leaves no heading for a group whose items were all filtered out", () => {
    expect(sectionsOf([{ href: "/d", label: "D", group: "Two" }])).toHaveLength(
      1,
    );
    expect(sectionsOf([])).toEqual([]);
  });
});
