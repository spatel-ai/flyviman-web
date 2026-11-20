import { describe, expect, it } from "vitest";
import { amountDueTitle, paymentSettled } from "./amount-due";

describe("paymentSettled", () => {
  it("is true once the summary moved on from where the payment started", () => {
    expect(paymentSettled("UNPAID", "UNPAID")).toBe(false);
    expect(paymentSettled("PARTIALLY_PAID", "UNPAID")).toBe(true);
    expect(paymentSettled("PAID", "UNPAID")).toBe(true);
  });

  it("does not count a balance payer's earlier deposit as this payment", () => {
    expect(paymentSettled("PARTIALLY_PAID", "PARTIALLY_PAID")).toBe(false);
    expect(paymentSettled("PAID", "PARTIALLY_PAID")).toBe(true);
  });
});

describe("amountDueTitle", () => {
  it("names the kind of amount due", () => {
    expect(amountDueTitle("FULL")).toBe("Amount due now");
    expect(amountDueTitle("DEPOSIT")).toBe("Deposit due now");
    expect(amountDueTitle("BALANCE")).toBe("Balance due now");
    expect(amountDueTitle("SOMETHING_NEW")).toBe("Amount due now");
  });
});
