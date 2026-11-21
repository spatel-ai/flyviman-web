import { ApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";
import type { Role, UserStatus } from "@/lib/api/types";
import { canManageUsers } from "./row-action";

/**
 * Whether the viewer may erase this account's personal data: super
 * administrators, for customer accounts not already erased. The API decides;
 * this hides the button.
 */
export function canErase(
  user: { role: Role; status: UserStatus },
  viewer: { id: string; role: Role } | undefined,
): boolean {
  return (
    canManageUsers(viewer) &&
    user.role === "CUSTOMER" &&
    user.status !== "ERASED"
  );
}

/** Why the API refuses to erase the customer yet (`USER_ERASURE_BLOCKED`). */
const BLOCKERS: Record<string, string> = {
  OPEN_BOOKINGS: "a booking or booking request is still open",
  PAYMENT_IN_PROGRESS: "a payment is still being processed",
  REFUND_IN_PROGRESS: "a refund is under way",
  REFUND_DUE: "a refund is still due to the customer",
  PAYMENT_UNDER_REVIEW:
    "a payment is flagged for another amount or a second capture at the gateway (check the reconciliation report)",
  BALANCE_DUE: "a flown trip is not fully paid",
  OPEN_AIR_AMBULANCE: "an air ambulance request is still open",
  RECENT_ACTIVITY:
    "a booking or request changed within the hold period (ERASURE_HOLD_DAYS)",
};

/** The message shown when erasing fails, with each reason it was refused. */
export function eraseErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "USER_ERASURE_BLOCKED": {
        const reasons = [
          ...new Set(
            error.details.map((detail) =>
              Object.hasOwn(BLOCKERS, detail.issue)
                ? BLOCKERS[detail.issue]
                : "something is still open",
            ),
          ),
        ];
        return `This customer's data cannot be erased yet: ${reasons.length > 0 ? reasons.join("; ") : "something is still open"}.`;
      }
      case "USER_INVALID_TRANSITION":
        return "This account has already been erased, or is not a customer account. The list now shows the latest.";
      case "NOT_FOUND":
        return "This user no longer exists.";
      case "FORBIDDEN":
        return "Your role cannot do this.";
      case "VALIDATION_ERROR":
        return "Give a reason of between 3 and 500 characters.";
    }
  }
  return messageFor(error);
}
