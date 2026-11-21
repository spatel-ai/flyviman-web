import { NextResponse, type NextRequest } from "next/server";
import { AIRCRAFT_SALES } from "@/content/aircraft-sales";
import { POLICY_SLUGS } from "@/features/legal/policies";
import {
  CLIENT_ADDRESS_HEADER,
  visitorAddressHeaders,
} from "@/lib/client-address";
import { apiProxyTarget, serverApiUrl } from "@/lib/env";
import { isPortalPage, portalCsp } from "@/lib/portal-csp";

const ACCESS = "access_token";
const REFRESH = "refresh_token";
const CSRF = "csrf_token";

/** Refresh when the access token has less than this long to live. */
const EXPIRY_MARGIN_SECONDS = 30;

/** Public pages that live under a protected prefix. */
const PUBLIC_PATHS = new Set(["/operator/register"]);

/**
 * Public pages addressed by a slug, with the slugs that exist. Any other
 * `/<section>/<slug>` must answer 404 on its first visit. The pages call
 * `notFound()` themselves, but they stream, so without this an unknown
 * address is first sent with status 200 (D-093).
 */
const KNOWN_SLUGS: Record<string, ReadonlySet<string>> = {
  "aircraft-sales": new Set(
    AIRCRAFT_SALES.listings.flatMap((listing) =>
      listing.slug ? [listing.slug] : [],
    ),
  ),
  // `image-credits` is a page of its own beside the policies.
  legal: new Set([...POLICY_SLUGS, "image-credits"]),
};
const SLUG_PAGE = /^\/(aircraft-sales|legal)\/([^/]+)\/?$/;
const API_PATH = /^\/api\/v1(?:\/|$)/;

/** Renders the site's not-found page with status 404 by rewriting to an
 *  address no route matches. */
function notFound(request: NextRequest): NextResponse {
  return NextResponse.rewrite(new URL("/_no-such-page", request.url));
}

/**
 * True when the cookie holds a token that is still valid for a while. This
 * only reads the expiry to decide whether to refresh; the API verifies the
 * signature on every request, so nothing here grants access.
 */
function isFresh(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = token.split(".")[1];
    const { exp } = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return (
      typeof exp === "number" && exp - EXPIRY_MARGIN_SECONDS > Date.now() / 1000
    );
  } catch {
    return false;
  }
}

function toLogin(request: NextRequest): NextResponse {
  const login = new URL("/login", request.url);
  login.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  // Cookies are left alone. This request may simply have lost a race with
  // another one that has already refreshed the session and set new cookies;
  // deleting them here would sign the user out.
  return NextResponse.redirect(login);
}

/** `name=value` pairs of a Cookie header, exactly as they were sent. */
function parseCookieHeader(header: string | null): Map<string, string> {
  const jar = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0)
      jar.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return jar;
}

/**
 * Proxies `/api/v1` to the API when API_PROXY_TARGET is set (D-065), so the
 * browser sees one origin. Any `x-flyviman-client-ip` the visitor sent is
 * dropped, and the visitor's own address is passed on, signed (D-069
 * follow-up). Unset, the request continues and finds no page (404), as
 * before: the browser then calls the API directly.
 */
async function proxyApi(request: NextRequest): Promise<NextResponse> {
  if (!apiProxyTarget) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_ADDRESS_HEADER);
  for (const [name, value] of Object.entries(
    await visitorAddressHeaders(request.headers),
  )) {
    headers.set(name, value);
  }
  const destination = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    apiProxyTarget,
  );
  return NextResponse.rewrite(destination, { request: { headers } });
}

/**
 * Lets the request through to its page. A portal page also gets a fresh
 * nonce-based Content-Security-Policy, on the request (Next.js reads the
 * nonce from it and puts it on the scripts it renders) and on the response
 * (lib/portal-csp.ts). `headers` are the request's, when changed here.
 */
async function next(
  request: NextRequest,
  headers?: Headers,
): Promise<NextResponse> {
  if (!isPortalPage(request.nextUrl.pathname)) {
    return headers
      ? NextResponse.next({ request: { headers } })
      : NextResponse.next();
  }
  const csp = await portalCsp();
  const requestHeaders = headers ?? new Headers(request.headers);
  requestHeaders.set(csp.name, csp.value);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(csp.name, csp.value);
  // A page carrying a per-request nonce must never be served from a cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * First line of route protection for the portals and the signed-in customer
 * pages. It is an optimistic check only: it looks for a session cookie and
 * never verifies it. A visitor with none is sent to sign-in before anything
 * renders. The role is checked by each protected layout (`requireRole`), and
 * the API, which every piece of data comes from, is the authority.
 *
 * It also rotates an expired session before the page renders, because server
 * components cannot set cookies.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (API_PATH.test(request.nextUrl.pathname)) return proxyApi(request);
  const slugPage = SLUG_PAGE.exec(request.nextUrl.pathname);
  if (slugPage) {
    // Slugs are plain ASCII, so the raw path segment is compared as it is.
    const [, section, slug] = slugPage;
    return KNOWN_SLUGS[section].has(slug)
      ? NextResponse.next()
      : notFound(request);
  }
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const access = request.cookies.get(ACCESS)?.value;
  const refresh = request.cookies.get(REFRESH)?.value;

  if (isFresh(access)) return next(request);
  if (!refresh) return toLogin(request);

  let rotated: Response;
  try {
    rotated = await fetch(`${serverApiUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: request.cookies.toString(),
        "X-CSRF-Token": request.cookies.get(CSRF)?.value ?? "",
        ...(await visitorAddressHeaders(request.headers)),
      },
      cache: "no-store",
    });
  } catch {
    // The API is unreachable: let the page render and show its own error.
    return next(request);
  }
  // The session is over (or this request lost a refresh race): sign in.
  if (rotated.status === 401) return toLogin(request);
  // Rate limited or failing: not a reason to treat the user as signed out.
  // Let the page render; its layout and the API decide.
  if (!rotated.ok) return next(request);

  // Hand the new cookies to the browser, and to this request so the page
  // being rendered already sees the new session. Values are passed through
  // exactly as received, never decoded and re-joined.
  const setCookies = rotated.headers.getSetCookie();
  const jar = parseCookieHeader(request.headers.get("cookie"));
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    if (index > 0)
      jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
  );

  const response = await next(request, headers);
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
  // A response that sets session cookies must never be stored by a cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/admin/:path*",
    "/operator/:path*",
    "/account/:path*",
    "/trips/:path*",
    "/book/:path*",
    "/aircraft-sales/:slug",
    "/legal/:slug",
  ],
};
