/** Razorpay Checkout: its loader script, and the API its frame and calls use. */
export const RAZORPAY_SCRIPT = "https://checkout.razorpay.com";
export const RAZORPAY_API = "https://api.razorpay.com";

/**
 * The payment page (M9), the only page allowed to load Razorpay Checkout,
 * as a `next.config.ts` header source. A document keeps the policy it was
 * loaded with, so the payment page must be entered with a full page load,
 * not a client-side navigation.
 */
export const CHECKOUT_PAGE = "/book/:reference/payment";

// The nonce branch is unused until W5 renders the portals per request (D-152).
export interface CspOptions {
  /**
   * Only for a page rendered per request, where Next.js puts this nonce on
   * every script it renders. No page is today: they are prerendered
   * (Cache Components), and a prerendered page's inline scripts (the
   * framework's page data among them) cannot carry one.
   */
  nonce?: string;
  /** With a nonce: the hash sources of our own inline scripts (inline-scripts.ts). */
  scriptHashes?: readonly string[];
  /**
   * The API's origins other than the site's own: the one the browser calls
   * when there is no `/api/v1` proxy, and the one signed storage links
   * (uploads, aircraft photos) point at, which is the API's own address
   * even behind the proxy.
   */
  apiOrigins: readonly string[];
  /** Adds the Razorpay Checkout allowances (CHECKOUT_PAGE). */
  checkout: boolean;
  /** React's development build needs `eval` for its debugging aids. */
  development: boolean;
}

/**
 * The Content-Security-Policy. On prerendered pages scripts are limited to
 * this site's own files and inline scripts (`'self' 'unsafe-inline'`): the
 * framework writes each page's data as inline scripts at build time, so
 * neither a nonce nor a hash can allow them. No `eval`, and no script from
 * another origin, except Razorpay's on the payment page. With a nonce the
 * script rule is strict instead: the nonce or a listed hash, and
 * `'strict-dynamic'` for what those load. Every other directive is strict
 * either way. Style attributes are server-rendered (the hero's CSS
 * variables, for one), so styles keep `'unsafe-inline'`.
 */
export function contentSecurityPolicy(options: CspOptions): string {
  const {
    nonce,
    scriptHashes = [],
    apiOrigins,
    checkout,
    development,
  } = options;
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      // A nonce or hash would make browsers ignore 'unsafe-inline'.
      ...(nonce
        ? [`'nonce-${nonce}'`, ...scriptHashes, "'strict-dynamic'"]
        : ["'unsafe-inline'"]),
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
 * The header that carries the policy. CSP_REPORT_ONLY=1 switches it to
 * report-only, for an emergency when the policy blocks something it should
 * not: violations are then logged in the browser console and nothing is
 * blocked. Read when the site is built (`next.config.ts`).
 */
export function cspHeaderName(
  reportOnly = process.env.CSP_REPORT_ONLY === "1",
) {
  return reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}
