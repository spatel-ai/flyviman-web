import { THEME_SCRIPT } from "@/components/theme/theme-script";
import { HERO_V1_SCRIPT } from "@/features/home-v1/hero-script";
import { HERO_SCRIPT } from "@/features/home/hero-script";

/**
 * Our own inline scripts, allowed by hash: they are constants, so this
 * needs no nonce plumbing into the components (the hero is a client
 * component). Everything else that runs (the framework's scripts and
 * their inline data) carries the request's nonce, set by `src/proxy.ts`.
 */
export const INLINE_SCRIPTS = [THEME_SCRIPT, HERO_SCRIPT, HERO_V1_SCRIPT];

/** Razorpay Checkout: its loader script, and the API its frame and calls use. */
export const RAZORPAY_SCRIPT = "https://checkout.razorpay.com";
export const RAZORPAY_API = "https://api.razorpay.com";

/**
 * The payment page (M9), the only page allowed to load Razorpay Checkout. A
 * document keeps the policy it was loaded with, so the payment page must be
 * entered with a full page load, not a client-side navigation.
 */
const CHECKOUT_PAGE = /^\/book\/[^/]+\/payment\/?$/;

export function isCheckoutPage(pathname: string): boolean {
  return CHECKOUT_PAGE.test(pathname);
}

/** A fresh nonce for one response. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

/** The CSP source that allows an inline script with exactly this text. */
export async function scriptHashSource(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`;
}

let inlineHashes: Promise<string[]> | undefined;

/** Hash sources of INLINE_SCRIPTS, computed once per server. */
export function inlineScriptHashes(): Promise<string[]> {
  inlineHashes ??= Promise.all(INLINE_SCRIPTS.map(scriptHashSource));
  return inlineHashes;
}

export interface CspOptions {
  nonce: string;
  /** From inlineScriptHashes(). */
  scriptHashes: readonly string[];
  /**
   * The API's origins other than the page's own: the one the browser calls
   * when there is no `/api/v1` proxy, and the one signed storage links
   * (uploads, aircraft photos) point at, which is the API's own address
   * even behind the proxy.
   */
  apiOrigins: readonly string[];
  /** Adds the Razorpay Checkout allowances (isCheckoutPage). */
  checkout: boolean;
  /** React's development build needs `eval` for its debugging aids. */
  development: boolean;
}

/**
 * The Content-Security-Policy for one page response. Scripts run only with
 * the nonce or a listed hash; `'strict-dynamic'` lets those load the
 * framework's chunks and dynamic imports (GSAP). Style attributes are
 * server-rendered (CSS variables on the hero, for one), so styles keep
 * `'unsafe-inline'`.
 */
export function contentSecurityPolicy(options: CspOptions): string {
  const { nonce, scriptHashes, apiOrigins, checkout, development } = options;
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      ...scriptHashes,
      "'strict-dynamic'",
      ...(checkout ? [RAZORPAY_SCRIPT] : []),
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", ...apiOrigins],
    ["font-src", "'self'"],
    [
      "connect-src",
      "'self'",
      ...apiOrigins,
      ...(checkout ? [RAZORPAY_API] : []),
    ],
    ["frame-src", ...(checkout ? [RAZORPAY_API] : ["'none'"])],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  return directives.map((directive) => directive.join(" ")).join("; ");
}

/**
 * The response header that carries the policy. CSP_REPORT_ONLY=1 switches
 * it to report-only, for an emergency when the policy blocks something it
 * should not: violations are then logged in the browser console and
 * nothing is blocked.
 */
export function cspHeaderName(
  reportOnly = process.env.CSP_REPORT_ONLY === "1",
) {
  return reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}
