import { describe, expect, it } from "vitest";
import { refundSchema } from "./refund-schema";

const schema = refundSchema(250_000);

describe("refundSchema", () => {
  it("turns rupees into paise and trims the reason", () => {
    expect(schema.parse({ amount: "2,500", reason: "  Cancelled  " })).toEqual({
      amount: 250_000,
      reason: "Cancelled",
    });
    expect(schema.parse({ amount: "10.5", reason: "Partial" }).amount).toBe(
      1_050,
    );
  });

  it("refuses more than the refundable remainder, nothing, or nonsense", () => {
    for (const amount of ["2500.01", "0", "", "abc", "-5"]) {
      expect(
        schema.safeParse({ amount, reason: "Cancelled" }).success,
        amount,
      ).toBe(false);
    }
  });

  it("needs a reason of 3 to 500 characters", () => {
    expect(schema.safeParse({ amount: "1", reason: " ab " }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ amount: "1", reason: "x".repeat(501) }).success,
    ).toBe(false);
  });
});
