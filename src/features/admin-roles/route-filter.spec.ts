import { describe, expect, it } from "vitest";
import { filterRoutes, type RouteAccess } from "./route-filter";

const routes: RouteAccess[] = [
  {
    method: "POST",
    path: "/auth/login",
    summary: "Sign in",
    public: true,
    roles: [],
  },
  {
    method: "GET",
    path: "/admin/users",
    summary: "List users",
    public: false,
    roles: ["OPS", "SUPER_ADMIN"],
  },
  {
    method: "PATCH",
    path: "/admin/users/:id/role",
    summary: "Change an internal account's role",
    public: false,
    roles: ["SUPER_ADMIN"],
  },
];

const paths = (list: RouteAccess[]) => list.map((route) => route.path);

describe("filterRoutes", () => {
  it("keeps every route for all roles and no search", () => {
    expect(filterRoutes(routes, "ALL", "")).toHaveLength(3);
  });

  it("keeps the routes a role may call, public ones included", () => {
    expect(paths(filterRoutes(routes, "OPS", ""))).toEqual([
      "/auth/login",
      "/admin/users",
    ]);
    expect(paths(filterRoutes(routes, "CUSTOMER", ""))).toEqual([
      "/auth/login",
    ]);
  });

  it("searches the path and summary, ignoring case and spaces", () => {
    expect(paths(filterRoutes(routes, "ALL", "  ROLE "))).toEqual([
      "/admin/users/:id/role",
    ]);
    expect(paths(filterRoutes(routes, "ALL", "sign in"))).toEqual([
      "/auth/login",
    ]);
  });
});
