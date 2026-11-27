import { describe, expect, it } from "vitest";
import {
  canAccept,
  canRespond,
  holdLabel,
  listQuery,
  parseFilter,
  quoteStatusLabel,
  requestPriceCopy,
  showsHold,
  serialiseFilter,
} from "./status";

const price = {
  priceType: "ESTIMATE",
  amountMinor: 1,
  currency: "INR",
} as never;

describe("what an operator may do", () => {
  it("accepts only a waiting, priced request with no quote out", () => {
    expect(canAccept({ status: "OPERATOR_PENDING", price, quote: null })).toBe(
      true,
    );
    expect(
      canAccept({ status: "OPERATOR_PENDING", price: null, quote: null }),
    ).toBe(false);
    expect(
      canAccept({
        status: "OPERATOR_PENDING",
        price,
        quote: { open: true } as never,
      }),
    ).toBe(false);
    expect(
      canAccept({ status: "CLARIFICATION_REQUESTED", price, quote: null }),
    ).toBe(false);
  });

  it("rejects, asks and quotes only while waiting", () => {
    expect(canRespond({ status: "OPERATOR_PENDING" })).toBe(true);
    expect(canRespond({ status: "CLARIFICATION_REQUESTED" })).toBe(false);
    expect(canRespond({ status: "CONFIRMED" })).toBe(false);
  });
});

describe("the list view", () => {
  it("reads and writes the address, leaving defaults out", () => {
    const filter = parseFilter(
      new URLSearchParams("status=EXPIRED&page=3&aircraft=nope"),
    );
    expect(filter).toEqual({ tab: "EXPIRED", aircraftId: "", page: 3 });
    expect(serialiseFilter(filter)).toBe("status=EXPIRED&page=3");
    expect(
      serialiseFilter(parseFilter(new URLSearchParams("status=zzz"))),
    ).toBe("");
    expect(listQuery(parseFilter(new URLSearchParams()))).toMatchObject({
      status: undefined,
    });
  });
});

describe("labels", () => {
  const now = Date.parse("2030-01-10T06:00:00Z");
  it("counts down the hold", () => {
    expect(holdLabel("2030-01-10T11:20:00Z", now)).toBe("5 h 20 min left");
    expect(holdLabel("2030-01-10T06:12:00Z", now)).toBe("12 min left");
    expect(holdLabel("2030-01-10T05:00:00Z", now)).toBe("Expired");
  });

  it("shows an unknown quote status as it is", () => {
    expect(quoteStatusLabel("SENT").label).toMatch(/waiting/);
    expect(quoteStatusLabel("NEW_THING")).toEqual({
      label: "NEW_THING",
      tone: "neutral",
    });
  });
});

describe("price copy and hold by status", () => {
  const confirmed = { ...(price as object), priceType: "CONFIRMED" } as never;
  it("shows the hold only while the operator has not answered", () => {
    expect(showsHold({ status: "OPERATOR_PENDING" })).toBe(true);
    expect(showsHold({ status: "AWAITING_PAYMENT" })).toBe(false);
    expect(showsHold({ status: "EXPIRED" })).toBe(false);
  });
  it("words a pending estimate as a proposal", () => {
    const copy = requestPriceCopy({ status: "OPERATOR_PENDING", price });
    expect(copy.name).toBe("Proposed price");
    expect(copy.note).toMatch(/quote sets the price/);
  });
  it("calls a confirmed price agreed, and never says estimate for it", () => {
    const copy = requestPriceCopy({
      status: "AWAITING_PAYMENT",
      price: confirmed,
    });
    expect(copy.name).toBe("Agreed price");
    expect(copy.note).not.toMatch(/estimate/i);
  });
  it("does not say a closed estimate is awaiting a quote", () => {
    const copy = requestPriceCopy({ status: "EXPIRED", price });
    expect(copy.note).toMatch(/not confirmed/);
  });
});
