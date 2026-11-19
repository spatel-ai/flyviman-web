import { describe, expect, it } from "vitest";
import { searchSchema, toSearchBody } from "./schema";

const valid = {
  kind: "charter" as const,
  originId: "a",
  destinationId: "b",
  date: "2026-12-05",
  time: "10:00",
  passengerCount: "4",
  category: "ANY",
};

describe("search form", () => {
  it("sends the departure in India time as an instant", () => {
    const body = toSearchBody(searchSchema.parse(valid));
    expect(body.departureAt).toBe("2026-12-05T04:30:00.000Z");
    expect(body.passengerCount).toBe(4);
    expect(body).not.toHaveProperty("category");
  });

  it("sends a category for charter only", () => {
    expect(
      toSearchBody(searchSchema.parse({ ...valid, category: "LIGHT_JET" })),
    ).toMatchObject({ category: "LIGHT_JET" });
    expect(
      toSearchBody(
        searchSchema.parse({
          ...valid,
          kind: "helicopter",
          category: "LIGHT_JET",
        }),
      ),
    ).not.toHaveProperty("category");
  });

  it("refuses the same origin and destination", () => {
    const result = searchSchema.safeParse({ ...valid, destinationId: "a" });
    expect(result.success).toBe(false);
  });

  it("sends no trip type for one way", () => {
    const body = toSearchBody(searchSchema.parse(valid));
    expect(body).not.toHaveProperty("tripType");
    expect(body).not.toHaveProperty("returnAt");
  });

  it("sends the return in India time for a round trip", () => {
    const body = toSearchBody(
      searchSchema.parse({
        ...valid,
        tripType: "ROUND_TRIP",
        returnDate: "2026-12-07",
        returnTime: "16:00",
      }),
    );
    expect(body).toMatchObject({
      tripType: "ROUND_TRIP",
      returnAt: "2026-12-07T10:30:00.000Z",
    });
  });

  it("needs a return, after the departure, for a round trip", () => {
    const round = { ...valid, tripType: "ROUND_TRIP" as const };
    expect(searchSchema.safeParse(round).success).toBe(false);
    expect(
      searchSchema.safeParse({
        ...round,
        returnDate: "2026-12-05",
        returnTime: "10:00",
      }).success,
    ).toBe(false);
    expect(
      searchSchema.safeParse({
        ...round,
        returnDate: "2026-12-05",
        returnTime: "18:00",
      }).success,
    ).toBe(true);
    // A return is not asked of a one-way search.
    expect(searchSchema.safeParse({ ...valid, returnDate: "" }).success).toBe(
      true,
    );
  });
});
