import { describe, expect, it } from "vitest";
import {
  bookingListQuery,
  DEFAULT_FILTER,
  isFiltered,
  parseBookingFilter,
  serialiseBookingFilter,
} from "./filters";

const parse = (query: string) => parseBookingFilter(new URLSearchParams(query));

describe("parseBookingFilter", () => {
  it("defaults to everything, first page", () => {
    expect(parse("")).toEqual(DEFAULT_FILTER);
  });

  it("reads a valid view", () => {
    expect(
      parse(
        "q=FLY-BK-7K&status=AWAITING_PAYMENT&payment=PAID&category=PRIVATE_CHARTER&from=2026-11-01&to=2026-11-30&page=3",
      ),
    ).toEqual({
      q: "FLY-BK-7K",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PAID",
      category: "PRIVATE_CHARTER",
      from: "2026-11-01",
      to: "2026-11-30",
      escalated: false,
      page: 3,
    });
  });

  it("falls back for values it does not know", () => {
    expect(
      parse(
        "status=DELETED&payment=owed&category=ROCKET&from=soon&to=2026-13-45&page=0",
      ),
    ).toEqual(DEFAULT_FILTER);
  });
});

describe("serialiseBookingFilter", () => {
  it("leaves defaults out and round-trips", () => {
    expect(serialiseBookingFilter(DEFAULT_FILTER)).toBe("");
    const view = { ...DEFAULT_FILTER, status: "CONFIRMED", page: 2 } as const;
    expect(parse(serialiseBookingFilter(view))).toEqual(view);
  });
});

describe("bookingListQuery", () => {
  it("sends only what is set, and includes the whole last day", () => {
    expect(bookingListQuery(DEFAULT_FILTER)).toEqual({
      q: undefined,
      status: undefined,
      paymentStatus: undefined,
      category: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      pageSize: 20,
    });
    const query = bookingListQuery({
      ...DEFAULT_FILTER,
      from: "2026-11-01",
      to: "2026-11-30",
    });
    // India is UTC+5:30: the day starts the evening before in UTC.
    expect(query.from).toBe("2026-10-31T18:30:00.000Z");
    expect(query.to).toBe("2026-11-30T18:30:00.000Z");
  });
});

describe("isFiltered", () => {
  it("is false for the default view only", () => {
    expect(isFiltered(DEFAULT_FILTER)).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTER, q: "x" })).toBe(true);
    expect(isFiltered({ ...DEFAULT_FILTER, page: 2 })).toBe(false);
  });
});
