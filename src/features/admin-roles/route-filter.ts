import type { Role, Schemas } from "@/lib/api/types";

export type RouteAccess = Schemas["RouteAccessDto"];
export type RoleFilter = Role | "ALL";

/**
 * The routes a role can call (public routes included), whose path or
 * summary contains the search, ignoring case.
 */
export function filterRoutes(
  routes: readonly RouteAccess[],
  role: RoleFilter,
  search: string,
): RouteAccess[] {
  const q = search.trim().toLowerCase();
  return routes.filter(
    (route) =>
      (role === "ALL" || route.public || route.roles.includes(role)) &&
      (!q ||
        route.path.toLowerCase().includes(q) ||
        (route.summary ?? "").toLowerCase().includes(q)),
  );
}
