import type { Role } from "@/lib/api/types";

export type Surface = "customer" | "operator" | "admin";

const INTERNAL: Role[] = ["OPS", "FINANCE_ADMIN", "SUPER_ADMIN"];
const OPERATOR: Role[] = ["OPERATOR_ADMIN", "OPERATOR_STAFF"];

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Customer",
  OPERATOR_ADMIN: "Operator administrator",
  OPERATOR_STAFF: "Operator staff",
  OPS: "Operations",
  FINANCE_ADMIN: "Finance",
  SUPER_ADMIN: "Super administrator",
};

/** Which surface a role belongs to. */
export function surfaceFor(role: Role): Surface {
  if (INTERNAL.includes(role)) return "admin";
  if (OPERATOR.includes(role)) return "operator";
  return "customer";
}

/** Where a user lands after signing in. */
export function homeFor(role: Role): string {
  const surface = surfaceFor(role);
  return surface === "customer" ? "/" : `/${surface}`;
}

/** The surface a path belongs to. Everything outside the portals is customer. */
export function surfaceOf(path: string): Surface {
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (path === "/operator" || path.startsWith("/operator/")) return "operator";
  return "customer";
}

/**
 * Where to send a user after sign-in: the page they were heading for when it
 * is a path on this site that their role can open, otherwise their home.
 *
 * `next` comes from the URL, so it is untrusted. It is parsed the way the
 * browser will parse it (which strips tabs and newlines, and treats `\\` as
 * `/`) against a placeholder origin; anything that resolves to another
 * origin is ignored, and what is returned is rebuilt from the parsed parts.
 */
export function destinationAfterLogin(
  role: Role,
  next?: string | null,
): string {
  const home = homeFor(role);
  if (!next || !next.startsWith("/")) return home;

  const base = "https://flyviman.invalid";
  let target: URL;
  try {
    target = new URL(next, base);
  } catch {
    return home;
  }
  if (target.origin !== base) return home;

  // Customer pages are for customers; portal pages for their own roles.
  return surfaceOf(target.pathname) === surfaceFor(role)
    ? `${target.pathname}${target.search}${target.hash}`
    : home;
}

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}
