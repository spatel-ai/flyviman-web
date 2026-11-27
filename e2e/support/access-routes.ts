import { readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/**
 * Every page under the protected surfaces, read from the `src/app` tree, so a
 * new page is picked up without anyone remembering to list it.
 */

const APP = resolve(__dirname, "../../src/app");
const PROTECTED = /^\/(admin|operator|account|book)(\/|$)/;
/** Public pages that live under a protected prefix (proxy.ts PUBLIC_PATHS). */
const PUBLIC = new Set(["/operator/register"]);

/** What a dynamic segment is replaced with: no such record exists. */
const PLACEHOLDER = "00000000-0000-4000-8000-000000000000";
const REFERENCE = "FLYNOSUCH0";
/** Well-formed but unused, so an air ambulance page passes its format check and has something to refuse. */
const AIR_AMBULANCE_REFERENCE = "FLY-AA-ZZZZZZ";

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

export interface ProtectedRoute {
  /** The route as written, with route groups removed: `/admin/bookings/[reference]`. */
  pattern: string;
  /** A path a browser can open: dynamic segments filled in. */
  path: string;
  surface: "admin" | "operator" | "customer";
}

export function protectedRoutes(): ProtectedRoute[] {
  return pageFiles(APP)
    .map((file) =>
      relative(APP, file)
        .split(sep)
        .slice(0, -1)
        .filter((segment) => !/^\(.*\)$/.test(segment)),
    )
    .map((segments) => `/${segments.join("/")}`)
    .filter((pattern) => PROTECTED.test(pattern) && !PUBLIC.has(pattern))
    .sort()
    .map((pattern) => ({
      pattern,
      path: pattern.replace(/\[(\w+)\]/g, (_, name: string) =>
        name !== "reference"
          ? PLACEHOLDER
          : pattern.includes("/air-ambulance/")
            ? AIR_AMBULANCE_REFERENCE
            : REFERENCE,
      ),
      surface: pattern.startsWith("/admin")
        ? "admin"
        : pattern.startsWith("/operator")
          ? "operator"
          : "customer",
    }));
}
