import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./errors";

/**
 * Wording for error codes, keyed by the stable `code` (never the API's
 * message). Codes not listed fall back to the API's own message.
 */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "We could not reach the server. Check your connection and try again.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
  IDEMPOTENCY_CONFLICT:
    "We may already have this request. Wait a moment, then reload the page before sending it again.",
  AUTH_INVALID_CREDENTIALS: "The email or password is not correct.",
  AUTH_ACCOUNT_SUSPENDED: "This account is suspended. Contact support.",
  AUTH_OTP_INVALID: "That code is not correct. Check it and try again.",
  AUTH_OTP_EXPIRED: "That code has expired. Request a new one.",
  AUTH_TOKEN_INVALID:
    "This link is not valid or has expired. Request a new one.",
  CSRF_TOKEN_INVALID:
    "Your session needs a refresh. Reload the page and try again.",
  CSRF_ORIGIN_REFUSED:
    "This request was refused because it did not come from the Flyviman site.",
  UNAUTHENTICATED: "Your session has ended. Sign in again.",
  FORBIDDEN: "You do not have access to this.",
  USER_LAST_SUPER_ADMIN:
    "This is the last active super administrator. Give another account that role first.",
  LOCATION_CODE_IN_USE: "Another location already has this code.",
  OPERATOR_NOT_APPROVED:
    "Your organisation must be approved by Flyviman before you can change this.",
  AIRCRAFT_NOT_APPROVED:
    "This aircraft is not approved, so it cannot take the request. Contact Flyviman if you think this is wrong.",
  BOOKING_UNAVAILABLE:
    "The aircraft can no longer fly this trip at that time. The page has been refreshed: choose another aircraft or ask the other party.",
  BOOKING_INVALID_TRANSITION:
    "This booking has changed since you opened it, so that action is no longer available. The page has been refreshed.",
  QUOTE_EXPIRED: "This quote has expired. A new one is needed.",
  QUOTE_INVALID_TRANSITION:
    "This quote has already been answered or replaced. The page has been refreshed.",
  CHANGE_REQUEST_DECIDED:
    "This change request has already been answered. The page has been refreshed.",
  PRICING_RULE_EXISTS:
    "A rule of this kind is already in force for these aircraft. Change that rule instead.",
  PRICING_RULE_NOT_CURRENT:
    "Someone changed or ended this rule since you opened it. The list now shows the latest version: close this and choose Change again.",
  PRICING_RULE_REQUIRED:
    "A rule for all aircraft cannot be ended, because every price relies on it. Change its value instead.",
  CONTENT_VERSION_CONFLICT:
    "This policy changed since you opened it. It has been reloaded: open it again to see the latest text.",
  CONTENT_UNCHANGED: "Nothing has changed. Edit the title or the text first.",
  BOOKING_PRICE_CHANGED:
    "The price has changed since you looked. Review the new figure before you send the request.",
  BOOKING_CATEGORY_DISABLED:
    "Requests for this kind of flight are not open at the moment.",
  BOOKING_DUPLICATE:
    "You already have an open request for this aircraft at about this time. Find it under your trips.",
  BOOKING_LIMIT_REACHED:
    "You have as many open requests as we allow. Wait for an answer or cancel one under your trips.",
  BOOKING_NOT_CANCELLABLE:
    "This trip can no longer be cancelled. It may already be closed.",
  BOOKING_CANCELLATION_CHANGED:
    "The cancellation charge has changed. The new figures are shown: check them and confirm again.",
  CHANGE_REQUEST_OPEN:
    "You already have a change request waiting for an answer.",
  CHANGE_REQUEST_NOT_ALLOWED:
    "A change can no longer be requested for this trip.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

/** A message safe to show a person for any thrown value. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? error.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Puts the API's field-level validation issues under the matching form
 * fields. Returns the message to show at form level, or `null` when every
 * issue was placed on a field.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  /** API field names that differ from the form's ("hourlyRateMinor" → "hourlyRate"). */
  aliases: Partial<Record<string, Path<T>>> = {},
): string | null {
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
    let placed = 0;
    for (const detail of error.details) {
      const field =
        (detail.field ? aliases[detail.field] : undefined) ??
        fields.find((name) => name === detail.field);
      if (field) {
        setError(field, { type: "server", message: sentence(detail.issue) });
        placed += 1;
      }
    }
    if (placed > 0 && placed === error.details.length) return null;
    if (placed > 0) return "Check the highlighted fields and try again.";
  }
  return messageFor(error);
}

function sentence(issue: string): string {
  const text = issue.trim();
  return text
    ? `${text[0].toUpperCase()}${text.slice(1)}.`.replace(/\.\.$/, ".")
    : text;
}
