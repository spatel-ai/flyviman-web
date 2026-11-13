import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/**
 * Every page in `src/app` whose address has a dynamic segment (`[slug]`,
 * `[id]`), found by reading the folders. The not-found guards (D-093) use
 * it, so a new page of this kind is checked without anyone remembering to
 * add it: `src/proxy.spec.ts` (fast) and `e2e/not-found.e2e.ts` (browser).
 */
export type DynamicRoute = {
  /** The address pattern, e.g. `/aircraft-sales/[slug]`. */
  pattern: string;
  /** Signed-in surfaces: the portals and the customer's account pages. */
  signedIn: boolean;
  /**
   * Loads its record in the browser and shows `RecordNotFound` when it does
   * not exist (status 200). True for every signed-in page and for the
   * public pages in `RECORD_PAGES`; the other public pages must answer 404.
   */
  loadsRecord: boolean;
};

/**
 * Public pages whose record is created at run time (a search), so the proxy
 * cannot know which addresses exist. They are `noindex`.
 */
export const RECORD_PAGES = [
  "/search/[searchId]",
  "/search/[searchId]/[resultId]",
];

/** Address prefixes that need a session (the `matcher` in `src/proxy.ts`). */
export const SIGNED_IN_PREFIXES = [
  "/admin",
  "/operator",
  "/account",
  "/trips",
  "/book",
];

const APP_DIR = resolve(__dirname, "../../src/app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return /^page\.(tsx|ts|jsx|js)$/.test(name) ? [dir] : [];
  });
}

/** The address pattern of every page, e.g. `/`, `/legal/image-credits`. */
export function allRoutes(): string[] {
  return pages(APP_DIR)
    .map((dir) => {
      const segments = relative(APP_DIR, dir)
        .split(sep)
        // Route groups such as `(customer)` are not part of the address.
        .filter((segment) => segment && !/^\(.*\)$/.test(segment));
      return `/${segments.join("/")}`;
    })
    .sort();
}

export function dynamicRoutes(): DynamicRoute[] {
  return allRoutes()
    .filter((pattern) => /\[[^\]]+\]/.test(pattern))
    .map((pattern) => {
      const signedIn = SIGNED_IN_PREFIXES.some(
        (prefix) => pattern === prefix || pattern.startsWith(`${prefix}/`),
      );
      return {
        pattern,
        signedIn,
        loadsRecord: signedIn || RECORD_PAGES.includes(pattern),
      };
    });
}

/** The pattern with every dynamic segment replaced by `value`. */
export function fill(pattern: string, value: string): string {
  return pattern.replace(/\[[^\]]+\]/g, value);
}
