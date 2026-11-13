/**
 * Reads API_PROXY_TARGET (D-065): the API's own origin, which this site
 * proxies `/api/v1` to. It must be an origin only, `https` in production
 * (session cookies and refresh tokens travel to it; localhost excepted), with no path, query or
 * credentials. A trailing slash or `/api/v1` is tolerated and removed. Shared
 * by next.config.ts and lib/env.ts, so both use exactly the same value.
 */
export function proxyTarget(
  raw: string | undefined,
  production: boolean,
): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value.replace(/\/+$/, "").replace(/\/api\/v1$/, ""));
  } catch {
    throw new Error(
      "API_PROXY_TARGET must be a URL such as https://api.example.com",
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("API_PROXY_TARGET must use https.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // A production build on this machine (the API_PROXY=1 browser suite)
  // reaches the local API over http; nothing else may.
  if (production && url.protocol !== "https:" && !local) {
    throw new Error("API_PROXY_TARGET must use https in production.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API_PROXY_TARGET must be an origin only.");
  }
  if (url.pathname !== "/") {
    throw new Error(
      "API_PROXY_TARGET must be the API's origin, without a path.",
    );
  }
  return url.origin;
}
