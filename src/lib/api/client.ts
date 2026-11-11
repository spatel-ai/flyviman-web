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
}

/**
 * The only way the app talks to flyviman-api. Sends cookies, unwraps the
 * `{ data, meta }` envelope and throws `ApiError` for error responses.
 * Session refresh and the CSRF header are added with authentication (M0).
 */
export async function apiFetch<T>(
  path: string,
  { body, headers, ...init }: ApiRequestInit = {},
): Promise<ApiResult<T>> {
  const url = `${env.NEXT_PUBLIC_API_URL}/${path.replace(/^\/+/, "")}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
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
