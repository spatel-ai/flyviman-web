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
