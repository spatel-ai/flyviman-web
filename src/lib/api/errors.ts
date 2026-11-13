export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

/**
 * An error response from flyviman-api. Switch on `code` (stable, from the
 * catalogue in docs/api/api-design.md), never on `message`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The record a page asked for does not exist: unknown (404) or the address
 * holds something that is not an id at all (400). A detail page shows
 * `RecordNotFound` for it, never a "could not load" message with a retry,
 * because retrying cannot help.
 */
export function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 ||
      error.code === "NOT_FOUND" ||
      error.code === "VALIDATION_ERROR")
  );
}
