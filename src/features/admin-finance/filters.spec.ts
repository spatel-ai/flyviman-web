import { describe, expect, it } from "vitest";
import {
  parsePaymentFilter,
  purposeLabel,
  serialisePaymentFilter,
} from "./filters";

const params = (query: string) => new URLSearchParams(query);

describe("payment filters", () => {
  it("reads a known status and page, and writes them back", () => {
    const filter = parsePaymentFilter(params("status=FAILED&page=3"));
    expect(filter).toEqual({ status: "FAILED", page: 3 });
    expect(serialisePaymentFilter(filter)).toBe("status=FAILED&page=3");
  });

  it("falls back to the default for anything not understood", () => {
    expect(parsePaymentFilter(params("status=NOPE&page=-2"))).toEqual({
      status: "ALL",
      page: 1,
    });
    expect(serialisePaymentFilter({ status: "ALL", page: 1 })).toBe("");
  });

  it("shows an unknown purpose as sent", () => {
    expect(purposeLabel("DEPOSIT")).toBe("Deposit");
    expect(purposeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
