import { env } from "@/lib/env";
import { ApiError, type ApiErrorDetail } from "./errors";

export interface ApiMeta {
  requestId: string | null;
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: ApiErrorDetail[];
    requestId?: string | null;
  };
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  /** Sent as JSON. */
  body?: unknown;
  /** Query string values; `undefined` and empty strings are left out. */
  query?: Record<string, string | number | undefined>;
}

export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "X-CSRF-Token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function apiUrl(path: string, query?: ApiRequestInit["query"]): string {
  const url = `${env.NEXT_PUBLIC_API_URL}/${path.replace(/^\/+/, "")}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

/** The readable CSRF cookie, which state-changing requests must repeat. */
function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE}=`));
  return entry
    ? decodeURIComponent(entry.slice(CSRF_COOKIE.length + 1))
    : undefined;
}

async function send(
  path: string,
  { body, headers, query, ...init }: ApiRequestInit,
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const csrf = SAFE_METHODS.has(method) ? undefined : csrfToken();
  try {
    return await fetch(apiUrl(path, query), {
      ...init,
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "We could not reach the server. Check your connection and try again.",
    );
  }
}

async function unwrap<T>(response: Response): Promise<ApiResult<T>> {
  if (response.status === 204) {
    return { data: null as T, meta: { requestId: null } };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as ErrorEnvelope | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details ?? [],
      error?.requestId ?? null,
    );
  }

  return payload as ApiResult<T>;
}

// Routes where a 401 is an answer, not an expired session: refreshing itself,
// and the public routes that sign in, register, verify or recover.
const NO_REFRESH =
  /^(auth\/(refresh|login|register|otp\/|email\/|password\/)|operator\/register)/;

// One refresh at a time: every request that finds the session expired waits
// for the same rotation, because each refresh token works only once.
let refreshing: Promise<boolean> | null = null;

/** The error code of a refused response, without consuming its body. */
async function errorCode(response: Response): Promise<string | undefined> {
  if (response.ok) return undefined;
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as ErrorEnvelope | null;
  return payload?.error?.code;
}

/**
 * The API answers UNAUTHENTICATED only when the session is missing or
 * expired, and never after a side effect, so repeating such a request cannot
 * do its work twice. A handler that refuses for another reason (for example a
 * future step-up check) must use a different code; see
 * docs/api/api-design.md.
 */
const SESSION_EXPIRED = "UNAUTHENTICATED";

/** How long to wait for a competing refresh's cookies to arrive. */
const RACE_WAIT_MS = 500;

function refreshSession(): Promise<boolean> {
  refreshing ??= send("auth/refresh", { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * The only way the app talks to flyviman-api. Sends the session cookies,
 * adds the CSRF header to state-changing requests, unwraps the
 * `{ data, meta }` envelope and throws `ApiError` for error responses.
 *
 * In the browser, a 401 caused by an expired access token is repaired once:
 * the session is refreshed and the request repeated. On the server, pass the
 * incoming cookies in `headers` (see `lib/auth/session.ts`); the proxy has
 * already refreshed the session if it needed it.
 */
export async function apiFetch<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<ApiResult<T>> {
  // The CSRF token each attempt was sent with, to tell later whether the
  // cookie changed in flight.
  let sentCsrf = csrfToken();
  const attempt = () => {
    sentCsrf = csrfToken();
    return send(path, init);
  };
  let response = await attempt();

  const canRefresh =
    response.status === 401 &&
    typeof window !== "undefined" &&
    !NO_REFRESH.test(path.replace(/^\/+/, "")) &&
    (await errorCode(response)) === SESSION_EXPIRED;
  if (canRefresh) {
    const refreshed = await refreshSession();
    response = await attempt();
    // Each refresh token works once, so a refused refresh may simply have
    // lost a race with another one (the web server renewing the session for
    // a page load, or another tab). The winner's cookies can still be on
    // their way to the browser, so wait briefly and repeat once more before
    // accepting that the session is over.
    if (
      !refreshed &&
      response.status === 401 &&
      (await errorCode(response)) === SESSION_EXPIRED
    ) {
      await new Promise((resolve) => setTimeout(resolve, RACE_WAIT_MS));
      response = await attempt();
    }
  }

  // A session refresh can replace the CSRF cookie in the instant between
  // reading it and sending the request. Repeat once, and only if the cookie
  // has really changed: otherwise the repeat could not succeed.
  if (
    typeof window !== "undefined" &&
    response.status === 403 &&
    (await errorCode(response)) === "CSRF_TOKEN_INVALID" &&
    csrfToken() !== sentCsrf
  ) {
    response = await attempt();
  }

  return unwrap<T>(response);
}
