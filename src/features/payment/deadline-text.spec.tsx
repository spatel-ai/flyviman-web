import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { payDeadline, timeLeft } from "./deadline-text";
import { TripSummary } from "./trip-summary";

const NOW = Date.parse("2026-11-27T10:00:00.000Z");

describe("payDeadline", () => {
  it("says when to pay by, in India time, with the time left", () => {
    const deadline = payDeadline("2026-11-29T13:30:00.000Z", NOW);
    expect(deadline?.expired).toBe(false);
    expect(deadline?.label).toBe("Pay by 29 Nov 2026, 7:00 pm IST");
    expect(deadline?.remaining).toBe("2 days 3 hours left");
  });

  it("says so once the deadline has passed", () => {
    const deadline = payDeadline("2026-11-27T09:59:00.000Z", NOW);
    expect(deadline?.expired).toBe(true);
    expect(deadline?.remaining).toBeNull();
    expect(deadline?.label).toMatch(/^The payment deadline passed on /);
  });

  it("shows nothing without a hold", () => {
    expect(payDeadline(null, NOW)).toBeNull();
  });

  it("counts down in whole units", () => {
    expect(timeLeft(61 * 60_000)).toBe("1 hour 1 minute left");
    expect(timeLeft(5 * 60_000)).toBe("5 minutes left");
    expect(timeLeft(30_000)).toBe("less than a minute left");
  });
});

describe("TripSummary", () => {
  it("names the route, time, aircraft, passengers and reference", () => {
    const booking = {
      reference: "FLY-BK-1",
      itinerary: {
        passengerCount: 2,
        emptyLeg: null,
        legs: [
          {
            originId: "o",
            originName: "Mumbai",
            destinationId: "d",
            destinationName: "Goa",
            departureAt: "2099-01-01T04:30:00.000Z",
          },
        ],
        aircraft: {
          manufacturer: "Cessna",
          model: "Citation",
          category: "PRIVATE_JET",
        },
      },
    } as never;
    render(<TripSummary booking={booking} />);
    expect(screen.getByText("Mumbai to Goa")).toBeInTheDocument();
    expect(screen.getByText(/1 Jan 2099, 10:00 am IST/)).toBeInTheDocument();
    expect(screen.getByText(/Cessna Citation/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("FLY-BK-1")).toBeInTheDocument();
  });
});
