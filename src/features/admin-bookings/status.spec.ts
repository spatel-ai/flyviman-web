import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  canActOnBookings,
  eventLabel,
  isPaidNotConfirmed,
  reviewReasonLabel,
} from "./status";

describe("isPaidNotConfirmed", () => {
  it("is true when money arrived and the booking still awaits payment", () => {
    expect(
      isPaidNotConfirmed({ status: "AWAITING_PAYMENT", paymentStatus: "PAID" }),
    ).toBe(true);
    expect(
      isPaidNotConfirmed({
        status: "AWAITING_PAYMENT",
        paymentStatus: "PARTIALLY_PAID",
      }),
    ).toBe(true);
  });
  it("is false otherwise", () => {
    expect(
      isPaidNotConfirmed({ status: "CONFIRMED", paymentStatus: "PAID" }),
    ).toBe(false);
    expect(
      isPaidNotConfirmed({
        status: "AWAITING_PAYMENT",
        paymentStatus: "UNPAID",
      }),
    ).toBe(false);
  });
});

describe("canActOnBookings", () => {
  it("is for operations and super administrators only", () => {
    expect(canActOnBookings("OPS")).toBe(true);
    expect(canActOnBookings("SUPER_ADMIN")).toBe(true);
    expect(canActOnBookings("FINANCE_ADMIN")).toBe(false);
    expect(canActOnBookings(undefined)).toBe(false);
  });
});

describe("labels", () => {
  it("shows an unknown value as sent", () => {
    expect(eventLabel("NOTE")).toBe("Internal note added");
    expect(eventLabel("NEW_THING")).toBe("NEW_THING");
    expect(reviewReasonLabel("OTHER")).toBe("OTHER");
  });
});

describe("booking and payment status badges", () => {
  it("are two separate badges with their own wording", () => {
    render(
      createElement("div", null, [
        createElement(StatusBadge, {
          key: "b",
          kind: "booking",
          status: "AWAITING_PAYMENT",
        }),
        createElement(StatusBadge, {
          key: "p",
          kind: "payment",
          status: "PAID",
        }),
        createElement(StatusBadge, {
          key: "u",
          kind: "booking",
          status: "FUTURE",
        }),
      ]),
    );
    expect(screen.getByText("Awaiting payment")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("FUTURE")).toBeTruthy();
  });
});
