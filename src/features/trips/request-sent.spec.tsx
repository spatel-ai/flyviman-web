import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isAwaitingOperator, RequestSent } from "./request-sent";

describe("RequestSent", () => {
  it("on first arrival says the request was sent, that nothing is booked or charged, and the steps in order", () => {
    render(<RequestSent status="OPERATOR_PENDING" sent />);
    expect(
      screen.getByRole("heading", { name: "Your request has been sent" }),
    ).toBeVisible();
    expect(screen.getByText(/Nothing is booked or charged yet/)).toBeVisible();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "The operator reviews your request.",
      "You get a confirmed price.",
      "You pay.",
      "Your trip is confirmed.",
    ]);
    expect(
      screen.getByText(/notify you as soon as the operator/),
    ).toBeVisible();
    // No response time is promised.
    expect(screen.queryByText(/within \d+/i)).toBeNull();
  });

  it("stays as a waiting notice when the booking is revisited", () => {
    render(<RequestSent status="REQUESTED" sent={false} />);
    expect(
      screen.getByRole("heading", { name: "Waiting for the operator" }),
    ).toBeVisible();
  });

  it("shows nothing once the operator has answered or the trip is closed", () => {
    for (const status of ["PRICE_CONFIRMED", "AWAITING_PAYMENT", "CANCELLED"]) {
      const { container } = render(<RequestSent status={status} sent />);
      expect(container).toBeEmptyDOMElement();
      expect(isAwaitingOperator(status)).toBe(false);
    }
  });
});
