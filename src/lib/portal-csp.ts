import { contentSecurityPolicy, cspHeaderName } from "@/lib/csp";
import { apiProxyTarget, env } from "@/lib/env";
import { inlineScriptHashes } from "@/lib/inline-scripts";

/**
 * The operator and admin portals' pages. They are rendered per request
 * (their layouts wait for the request), so Next.js puts the request's nonce
 * on every script it renders, and they get a nonce-based policy instead of
 * the build-time one in `next.config.ts` (D-152, D-161).
 * `/operator/register` is not one: it lives in `(auth)` and is prerendered.
 */
const PORTAL_PAGE = /^\/(?:operator|admin)(?:\/|$)/;

export function isPortalPage(pathname: string): boolean {
  return PORTAL_PAGE.test(pathname) && pathname !== "/operator/register";
}

/** The same API origins `next.config.ts` allows. */
const API_ORIGINS = [
  ...new Set(
    [new URL(env.NEXT_PUBLIC_API_URL).origin, apiProxyTarget].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
];

/** Our own inline scripts (the theme script in the root layout) carry no
 *  nonce: the root layout is shared with the prerendered pages. Their
 *  hashes allow them instead. */
let hashes: Promise<string[]> | undefined;

/** A fresh nonce and the policy that carries it, under the header name
 *  CSP_REPORT_ONLY selects (read on each request here). */
export async function portalCsp(): Promise<{ name: string; value: string }> {
  hashes ??= inlineScriptHashes();
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  );
  return {
    name: cspHeaderName(),
    value: contentSecurityPolicy({
      nonce,
      scriptHashes: await hashes,
      apiOrigins: API_ORIGINS,
      checkout: false,
      development: process.env.NODE_ENV === "development",
    }),
  };
}
