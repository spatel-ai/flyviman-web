import type { NextConfig } from "next";

/**
 * Sent with every response. The pages hold account and compliance data, so
 * they must not be framed by another site, sniffed as another type, or leak
 * their address (which can carry a one-time link) to other origins.
 *
 * A full Content-Security-Policy for scripts is not set yet: it needs
 * nonces for the framework's inline scripts and the inline theme script.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
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
