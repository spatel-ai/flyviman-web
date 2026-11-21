import { ApiError } from "@/lib/api/errors";

/** Why the API refuses to delete the account yet (`USER_ERASURE_BLOCKED`). */
const BLOCKERS: Record<string, string> = {
  OPEN_BOOKINGS:
    "You have a trip or booking request that is still open. Cancel it, or wait until it has been flown.",
  PAYMENT_IN_PROGRESS:
    "A payment is still being processed. Wait for it to finish.",
  REFUND_IN_PROGRESS:
    "A refund is on its way to you. Wait until it has arrived.",
  REFUND_DUE: "We still owe you a refund. Wait until we have paid it back.",
  OPEN_AIR_AMBULANCE:
    "You have an air ambulance request that is still open. Withdraw it, or wait until it is closed.",
  RECENT_ACTIVITY:
    "One of your trips or requests changed recently. We keep accounts for a short time after that in case of a dispute. Try again later.",
};

const UNKNOWN_BLOCKER = "Something on your account is still open.";

/**
 * The reasons in a `USER_ERASURE_BLOCKED` answer, as sentences, once each;
 * an unknown reason is shown in general terms. Empty for any other error.
 */
export function erasureBlockerMessages(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== "USER_ERASURE_BLOCKED") {
    return [];
  }
  const messages = error.details.map((detail) =>
    Object.hasOwn(BLOCKERS, detail.issue)
      ? BLOCKERS[detail.issue]
      : UNKNOWN_BLOCKER,
  );
  const unique = [...new Set(messages)];
  return unique.length > 0 ? unique : [UNKNOWN_BLOCKER];
}
