import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, type StatusKind } from "./status-badge";

describe("StatusBadge", () => {
  it.each<[StatusKind, string, string, string]>([
    ["booking", "REQUESTED", "Requested", "text-muted"],
    ["booking", "OPERATOR_PENDING", "Awaiting operator", "text-warning"],
    [
      "booking",
      "CLARIFICATION_REQUESTED",
      "Clarification needed",
      "text-warning",
    ],
    ["booking", "AWAITING_PAYMENT", "Awaiting payment", "text-warning"],
    ["booking", "PRICE_CONFIRMED", "Price confirmed", "text-info"],
    ["booking", "CONFIRMED", "Confirmed", "text-success"],
    ["booking", "SCHEDULED", "Scheduled", "text-success"],
    ["booking", "COMPLETED", "Completed", "text-success"],
    ["booking", "OPERATOR_UNAVAILABLE", "Operator unavailable", "text-danger"],
    ["booking", "EXPIRED", "Expired", "text-danger"],
    ["booking", "CANCELLED", "Cancelled", "text-danger"],
    ["booking", "QUOTE_DECLINED", "Quote declined", "text-danger"],
    ["payment", "UNPAID", "Unpaid", "text-muted"],
    ["payment", "INITIATED", "Pending", "text-warning"],
    ["payment", "PENDING", "Pending", "text-warning"],
    ["payment", "REFUND_PENDING", "Refund pending", "text-warning"],
    ["payment", "PARTIALLY_PAID", "Partially paid", "text-info"],
    ["payment", "PARTIALLY_REFUNDED", "Partially refunded", "text-info"],
    ["payment", "PAID", "Paid", "text-success"],
    ["payment", "SUCCEEDED", "Paid", "text-success"],
    ["payment", "REFUNDED", "Refunded", "text-success"],
    ["payment", "FAILED", "Failed", "text-danger"],
    ["operator", "DRAFT", "Draft", "text-muted"],
    ["operator", "PENDING_REVIEW", "Under review", "text-warning"],
    ["operator", "APPROVED", "Approved", "text-success"],
    ["operator", "REJECTED", "Not approved", "text-danger"],
    ["operator", "SUSPENDED", "Suspended", "text-danger"],
    ["document", "PENDING", "Under review", "text-warning"],
    ["document", "VERIFIED", "Verified", "text-success"],
    ["document", "REJECTED", "Not accepted", "text-danger"],
    ["user", "PENDING_VERIFICATION", "Verification pending", "text-warning"],
    ["user", "ACTIVE", "Active", "text-success"],
    ["user", "SUSPENDED", "Suspended", "text-danger"],
  ])("shows %s status %s as %s", (kind, status, label, toneClass) => {
    render(<StatusBadge kind={kind} status={status} />);

    expect(screen.getByText(label)).toHaveClass(toneClass);
  });

  it("never calls a payment-pending booking confirmed", () => {
    render(<StatusBadge kind="booking" status="AWAITING_PAYMENT" />);

    expect(screen.queryByText(/confirmed/i)).not.toBeInTheDocument();
  });

  it("shows an unknown status as it is, in the neutral tone", () => {
    render(<StatusBadge kind="booking" status="ON_HOLD" />);

    expect(screen.getByText("ON_HOLD")).toHaveClass("text-muted");
  });

  it("does not treat inherited object keys as statuses", () => {
    render(<StatusBadge kind="user" status="toString" />);

    expect(screen.getByText("toString")).toHaveClass("text-muted");
  });

  it("keeps a long label on one line", () => {
    render(<StatusBadge kind="user" status="PENDING_VERIFICATION" />);

    expect(screen.getByText("Verification pending")).toHaveClass(
      "whitespace-nowrap",
    );
  });

  it("names an aircraft's listing and availability", () => {
    render(
      <>
        <StatusBadge kind="aircraft" status="PENDING_REVIEW" />
        <StatusBadge kind="availability" status="MAINTENANCE" />
      </>,
    );
    expect(screen.getByText("Under review")).toHaveAttribute(
      "data-status",
      "PENDING_REVIEW",
    );
    expect(screen.getByText("Maintenance")).toHaveAttribute(
      "data-status",
      "MAINTENANCE",
    );
  });
});
