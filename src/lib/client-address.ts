/**
 * Passes the visitor's address on to the API (D-069 follow-up). Behind this
 * site's `/api/v1` proxy (API_PROXY_TARGET, D-065) every request reaches the
 * API from this host's addresses, so rate limits and the sign-in lockout
 * would count all visitors as one. This host therefore signs the visitor's
 * address with WEB_PROXY_SECRET, a secret shared with the API, which uses the
 * address only when the signature verifies and is under a minute old
 * (`flyviman-api/src/common/middleware/client-address.middleware.ts`).
 *
 * Server only. The secret is read from `process.env` when a request is
 * signed; it is not a NEXT_PUBLIC_ value, so it never reaches the browser.
 */

/** Carries `<address> <unix seconds> <base64url HMAC-SHA256>` to the API. */
export const CLIENT_ADDRESS_HEADER = "x-flyviman-client-ip";

/**
 * Where the visitor's address is read. Vercel sets it on every request to
 * the visitor's own address and overwrites any value the visitor sent
 * (vercel.com/docs/headers/request-headers). Only a host that does the same
 * can be trusted with it: under a plain `next start` a visitor can set it,
 * which is harmless only because such a host has no secret.
 */
const VISITOR_ADDRESS_HEADER = "x-real-ip";

const MIN_SECRET_LENGTH = 32;

/** An IPv4 or IPv6 address, loosely; the API checks it strictly. */
const ADDRESS = /^[0-9A-Fa-f:.]{2,45}$/;

/**
 * Checks WEB_PROXY_SECRET at start-up. Optional: unset, `/api/v1` is proxied
 * exactly as before, with no visitor address, and a production server that
 * proxies says so once in its log. A value that is set must be long enough.
 */
export function proxySecret(
  raw: string | undefined,
  production: boolean,
  proxied: boolean,
): string | undefined {
  const value = raw?.trim();
  if (!value) {
    if (production && proxied) {
      console.warn(
        "WEB_PROXY_SECRET is not set: /api/v1 is proxied without the visitor's address, so the API counts every visitor as this host (deployment.md).",
      );
    }
    return undefined;
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `WEB_PROXY_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }
  return value;
}

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** The header value for an address, signed now (Web Crypto, any runtime). */
export async function signClientAddress(
  address: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`flyviman-client-ip:v1\n${address}\n${nowSeconds}`),
  );
  return `${address} ${nowSeconds} ${base64url(signature)}`;
}

/**
 * The signed header for a request to the API on behalf of the visitor whose
 * request headers are given, or none when there is no secret or no usable
 * address (the API then counts this host's own address, as before).
 */
export async function visitorAddressHeaders(
  incoming: Headers,
): Promise<Record<string, string>> {
  const secret = process.env.WEB_PROXY_SECRET?.trim();
  const address = incoming.get(VISITOR_ADDRESS_HEADER)?.trim();
  if (
    !secret ||
    secret.length < MIN_SECRET_LENGTH ||
    !address ||
    !ADDRESS.test(address)
  ) {
    return {};
  }
  return {
    [CLIENT_ADDRESS_HEADER]: await signClientAddress(address, secret),
  };
}
