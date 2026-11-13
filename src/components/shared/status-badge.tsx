import { Badge, type Tone } from "@/components/ui/badge";

export type StatusKind =
  | "booking"
  | "payment"
  | "operator"
  | "document"
  | "user"
  | "aircraft"
  | "availability"
  | "staff";

export type BookingStatus =
  | "REQUESTED"
  | "OPERATOR_PENDING"
  | "CLARIFICATION_REQUESTED"
  | "PRICE_CONFIRMED"
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "SCHEDULED"
  | "COMPLETED"
  | "OPERATOR_UNAVAILABLE"
  | "QUOTE_DECLINED"
  | "EXPIRED"
  | "CANCELLED";

/**
 * The booking's payment summary (UNPAID to REFUNDED) and the statuses of a
 * single payment attempt (INITIATED to PARTIALLY_REFUNDED).
 */
export type PaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "INITIATED"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "PARTIALLY_REFUNDED";

export type OperatorStatus =
  "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type DocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";

/** An aircraft listing: same lifecycle and words as an operator's. */
export type AircraftListingStatus = OperatorStatus;

/** Whether the operator offers the aircraft at all, set by the operator. */
export type AircraftAvailabilityStatus =
  "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";

export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";

/** An operator's staff member, as the team page shows them. */
export type StaffStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

interface Presentation {
  label: string;
  tone: Tone;
}

// Wording and tone: docs/frontend/design-system.md (StatusBadge).
const BOOKING: Record<BookingStatus, Presentation> = {
  REQUESTED: { label: "Requested", tone: "neutral" },
  OPERATOR_PENDING: { label: "Awaiting operator", tone: "warning" },
  CLARIFICATION_REQUESTED: { label: "Clarification needed", tone: "warning" },
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "warning" },
  PRICE_CONFIRMED: { label: "Price confirmed", tone: "info" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  SCHEDULED: { label: "Scheduled", tone: "success" },
  COMPLETED: { label: "Completed", tone: "success" },
  OPERATOR_UNAVAILABLE: { label: "Operator unavailable", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  QUOTE_DECLINED: { label: "Quote declined", tone: "danger" },
};

const PAYMENT: Record<PaymentStatus, Presentation> = {
  UNPAID: { label: "Unpaid", tone: "neutral" },
  INITIATED: { label: "Pending", tone: "warning" },
  PENDING: { label: "Pending", tone: "warning" },
  REFUND_PENDING: { label: "Refund pending", tone: "warning" },
  PARTIALLY_PAID: { label: "Partially paid", tone: "info" },
  PARTIALLY_REFUNDED: { label: "Partially refunded", tone: "info" },
  PAID: { label: "Paid", tone: "success" },
  SUCCEEDED: { label: "Paid", tone: "success" },
  REFUNDED: { label: "Refunded", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

const OPERATOR: Record<OperatorStatus, Presentation> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "Under review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Not approved", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

const AIRCRAFT: Record<AircraftListingStatus, Presentation> = OPERATOR;

const AVAILABILITY: Record<AircraftAvailabilityStatus, Presentation> = {
  AVAILABLE: { label: "Available", tone: "success" },
  UNAVAILABLE: { label: "Unavailable", tone: "neutral" },
  MAINTENANCE: { label: "Maintenance", tone: "warning" },
};

const DOCUMENT: Record<DocumentStatus, Presentation> = {
  PENDING: { label: "Under review", tone: "warning" },
  VERIFIED: { label: "Verified", tone: "success" },
  REJECTED: { label: "Not accepted", tone: "danger" },
};

const USER: Record<UserStatus, Presentation> = {
  PENDING_VERIFICATION: { label: "Verification pending", tone: "warning" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

const STAFF: Record<StaffStatus, Presentation> = {
  INVITED: { label: "Invited", tone: "warning" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

const PRESENTATION: Record<StatusKind, Record<string, Presentation>> = {
  booking: BOOKING,
  payment: PAYMENT,
  operator: OPERATOR,
  document: DOCUMENT,
  user: USER,
  aircraft: AIRCRAFT,
  availability: AVAILABILITY,
  staff: STAFF,
};

export interface StatusBadgeProps {
  kind: StatusKind;
  /**
   * The status as the API returns it. A value this component does not know
   * is shown as it is, in the neutral tone, rather than failing.
   */
  status: string;
  className?: string;
}

/**
 * Maps a status to its wording and tone. The text carries the meaning; the
 * colour only supports it. Booking and payment status are always two badges.
 */
export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const known = Object.hasOwn(PRESENTATION[kind], status)
    ? PRESENTATION[kind][status]
    : undefined;

  return (
    <Badge
      tone={known?.tone ?? "neutral"}
      data-status={status}
      className={className}
    >
      {known?.label ?? status}
    </Badge>
  );
}
