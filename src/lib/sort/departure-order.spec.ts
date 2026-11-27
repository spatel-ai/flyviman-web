import { describe, expect, it } from "vitest";
import {
  compareDeparture,
  sortByDeparture,
  sortOffers,
} from "./departure-order";

describe("sortByDeparture", () => {
  const at = (departureAt: string | null) => ({ departureAt });
  const pick = (item: { departureAt: string | null }) => item.departureAt;

  it("puts the same day in clock order", () => {
    const sorted = sortByDeparture(
      [at("2026-12-05T15:00:00Z"), at("2026-12-05T04:30:00Z")],
      pick,
    );
    expect(sorted.map(pick)).toEqual([
      "2026-12-05T04:30:00Z",
      "2026-12-05T15:00:00Z",
    ]);
  });

  it("orders across months and years, soonest or latest first", () => {
    const rows = [
      at("2027-01-02T00:00:00Z"),
      at("2026-11-30T00:00:00Z"),
      at("2026-12-01T00:00:00Z"),
    ];
    expect(sortByDeparture(rows, pick).map(pick)).toEqual([
      "2026-11-30T00:00:00Z",
      "2026-12-01T00:00:00Z",
      "2027-01-02T00:00:00Z",
    ]);
    expect(sortByDeparture(rows, pick, "latest").map(pick)).toEqual([
      "2027-01-02T00:00:00Z",
      "2026-12-01T00:00:00Z",
      "2026-11-30T00:00:00Z",
    ]);
  });

  it("keeps a missing or unreadable departure last in both directions", () => {
    const rows = [at(null), at("2026-12-01T00:00:00Z"), at("nonsense")];
    expect(sortByDeparture(rows, pick)[0].departureAt).toBe(
      "2026-12-01T00:00:00Z",
    );
    expect(sortByDeparture(rows, pick, "latest")[0].departureAt).toBe(
      "2026-12-01T00:00:00Z",
    );
    expect(compareDeparture(null, null)).toBe(0);
  });

  it("does not change the list it is given", () => {
    const rows = [at("2026-12-02T00:00:00Z"), at("2026-12-01T00:00:00Z")];
    sortByDeparture(rows, pick);
    expect(rows[0].departureAt).toBe("2026-12-02T00:00:00Z");
  });
});

describe("sortOffers", () => {
  it("lists published before closed offers, each group by departure", () => {
    const offer = (status: string, departureFrom: string | null) => ({
      status,
      departureFrom,
    });
    const sorted = sortOffers([
      offer("WITHDRAWN", "2026-12-01T00:00:00Z"),
      offer("EXPIRED", "2026-11-01T00:00:00Z"),
      offer("PUBLISHED", "2026-12-20T00:00:00Z"),
      offer("PUBLISHED", "2026-12-03T00:00:00Z"),
      offer("PUBLISHED", null),
      offer("SOMETHING_NEW", "2026-10-01T00:00:00Z"),
    ]);
    expect(sorted.map((o) => `${o.status} ${o.departureFrom}`)).toEqual([
      "PUBLISHED 2026-12-03T00:00:00Z",
      "PUBLISHED 2026-12-20T00:00:00Z",
      "PUBLISHED null",
      "SOMETHING_NEW 2026-10-01T00:00:00Z",
      "EXPIRED 2026-11-01T00:00:00Z",
      "WITHDRAWN 2026-12-01T00:00:00Z",
    ]);
  });
});
