import type { NextConfig } from "next";
import { proxySecret } from "./src/lib/client-address";
import {
  CHECKOUT_PAGE,
  CHECKOUT_PAYMENT_PERMISSION,
  contentSecurityPolicy,
  cspHeaderName,
} from "./src/lib/csp";
import { proxyTarget } from "./src/lib/proxy-target";

const production = process.env.NODE_ENV === "production";

/**
 * The API's origins the pages use besides their own (lib/csp.ts): where the
 * browser calls it (NEXT_PUBLIC_API_URL, the site itself behind the
 * `/api/v1` proxy) and where its signed storage links point
 * (API_PROXY_TARGET, the API's own address).
 */
const API_ORIGINS = [
  new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin,
  proxyTarget(process.env.API_PROXY_TARGET, production),
].filter((origin): origin is string => Boolean(origin));

/** The Content-Security-Policy, set when the site is built. */
function csp(checkout: boolean) {
  return {
    key: cspHeaderName(),
    value: contentSecurityPolicy({
      apiOrigins: [...new Set(API_ORIGINS)],
      checkout,
      development: process.env.NODE_ENV === "development",
    }),
  };
}

/**
 * Sent with every response. The pages hold account and compliance data, so
 * they must not be framed by another site, sniffed as another type, or leak
 * their address (which can carry a one-time link) to other origins.
 *
 * The Content-Security-Policy limits what the pages may load and run
 * (lib/csp.ts).
 */
const PERMISSIONS = "camera=(), microphone=(), geolocation=()";

const SECURITY_HEADERS = [
  csp(false),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: `${PERMISSIONS}, payment=()`,
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

/**
 * Checked here so a short secret fails at build and start-up, and a missing
 * one is reported once (it is optional). The
 * proxying itself (D-065) is done by `src/proxy.ts`, which also passes the
 * visitor's address on, signed with WEB_PROXY_SECRET (`lib/client-address.ts`).
 */
proxySecret(
  process.env.WEB_PROXY_SECRET,
  production,
  Boolean(proxyTarget(process.env.API_PROXY_TARGET, production)),
);

/** Pages whose address carries a single-use token or attempt ID. */
const NO_REFERRER = [{ key: "Referrer-Policy", value: "no-referrer" }];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Listed after the general entry, so its headers are the ones sent.
      {
        source: CHECKOUT_PAGE,
        headers: [
          csp(true),
          {
            key: "Permissions-Policy",
            value: `${PERMISSIONS}, ${CHECKOUT_PAYMENT_PERMISSION}`,
          },
        ],
      },
      { source: "/reset-password", headers: NO_REFERRER },
      { source: "/verify", headers: NO_REFERRER },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
