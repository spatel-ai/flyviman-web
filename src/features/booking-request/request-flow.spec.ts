import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { newEstimateFrom } from "./request-flow";

describe("newEstimateFrom", () => {
  it("reads the new estimate a price change carries", () => {
    const error = new ApiError(409, "BOOKING_PRICE_CHANGED", "changed", [
      { field: "totalMinor", issue: "7000000" },
      { field: "currency", issue: "INR" },
      { field: "priceType", issue: "ESTIMATE" },
      { field: "validUntil", issue: "2099-01-01T00:00:00.000Z" },
    ]);
    expect(newEstimateFrom(error)).toEqual({
      totalMinor: 7_000_000,
      currency: "INR",
      priceType: "ESTIMATE",
      validUntil: "2099-01-01T00:00:00.000Z",
    });
  });
  it("is null for a result now priced on request, and for other errors", () => {
    expect(
      newEstimateFrom(
        new ApiError(409, "BOOKING_PRICE_CHANGED", "x", [
          { field: "price", issue: "ON_REQUEST" },
        ]),
      ),
    ).toBeNull();
    expect(
      newEstimateFrom(new ApiError(409, "BOOKING_UNAVAILABLE", "x")),
    ).toBeNull();
  });
});
