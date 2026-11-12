import { NextResponse, type NextRequest } from "next/server";
import { serverApiUrl } from "@/lib/env";

const ACCESS = "access_token";
const REFRESH = "refresh_token";
const CSRF = "csrf_token";

/** Refresh when the access token has less than this long to live. */
const EXPIRY_MARGIN_SECONDS = 30;

/** Public pages that live under a protected prefix. */
const PUBLIC_PATHS = new Set(["/operator/register"]);

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
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const access = request.cookies.get(ACCESS)?.value;
  const refresh = request.cookies.get(REFRESH)?.value;

  if (isFresh(access)) return NextResponse.next();
  if (!refresh) return toLogin(request);

  let rotated: Response;
  try {
    rotated = await fetch(`${serverApiUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: request.cookies.toString(),
        "X-CSRF-Token": request.cookies.get(CSRF)?.value ?? "",
      },
      cache: "no-store",
    });
  } catch {
    // The API is unreachable: let the page render and show its own error.
    return NextResponse.next();
  }
  // The session is over (or this request lost a refresh race): sign in.
  if (rotated.status === 401) return toLogin(request);
  // Rate limited or failing: not a reason to treat the user as signed out.
  // Let the page render; its layout and the API decide.
  if (!rotated.ok) return NextResponse.next();

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

  const response = NextResponse.next({ request: { headers } });
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
  // A response that sets session cookies must never be stored by a cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/operator/:path*",
    "/account/:path*",
    "/trips/:path*",
    "/book/:path*",
  ],
};
