/**
 * Razorpay Checkout: its loader script (which also serves the checkout's own
 * frame), the API its frame and calls use, its logging endpoint and its
 * images (bank and card logos). Razorpay publishes no CSP list: these are
 * the origins Checkout is known to use, and must be checked in the browser
 * console against Razorpay's test mode before real payments are switched on
 * (W4-3 report).
 */
export const RAZORPAY_SCRIPT = "https://checkout.razorpay.com";
export const RAZORPAY_API = "https://api.razorpay.com";
export const RAZORPAY_LOGGING = "https://lumberjack.razorpay.com";
export const RAZORPAY_IMAGES = "https://cdn.razorpay.com";

/**
 * The Permissions-Policy `payment` allowance for the payment page: the page
 * and Razorpay's frames may use the browser's Payment Request API. Every
 * other page denies it (`payment=()`).
 */
export const CHECKOUT_PAYMENT_PERMISSION = `payment=(self "${RAZORPAY_SCRIPT}" "${RAZORPAY_API}")`;

/**
 * The payment page (M9), the only page allowed to load Razorpay Checkout,
 * as a `next.config.ts` header source. A document keeps the policy it was
 * loaded with, so the payment page must be entered with a full page load
 * (a plain `<a>`), not a client-side navigation.
 */
export const CHECKOUT_PAGE = "/account/trips/:reference/pay";

export interface CspOptions {
  /**
   * Only for a page rendered per request, where Next.js puts this nonce on
   * every script it renders: the operator and admin portals, whose policy
   * `proxy.ts` sets (lib/portal-csp.ts). Every other page is prerendered
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
    [
      "img-src",
      "'self'",
      "data:",
      ...apiOrigins,
      ...(checkout ? [RAZORPAY_IMAGES] : []),
    ],
    ["font-src", "'self'"],
    [
      "connect-src",
      "'self'",
      ...apiOrigins,
      ...(checkout ? [RAZORPAY_API, RAZORPAY_LOGGING] : []),
    ],
    ["frame-src", ...(checkout ? [RAZORPAY_SCRIPT, RAZORPAY_API] : ["'none'"])],
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
 * blocked. Read when the site is built (`next.config.ts`), and by the
 * portals' policy when the server runs (`proxy.ts`): set it for both, as a
 * redeploy does. Set only at run time, the portals keep the enforced
 * build-time policy and report against the nonce-based one.
 */
export function cspHeaderName(
  reportOnly = process.env.CSP_REPORT_ONLY === "1",
) {
  return reportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}
