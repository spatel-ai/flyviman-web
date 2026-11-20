import { describe, expect, it } from "vitest";
import { quoteAmountMinor, quoteSchema } from "./schema";

describe("air ambulance quote form", () => {
  it("takes rupees up to ₹2 crore, as paise", () => {
    expect(quoteAmountMinor("4,50,000")).toBe(45_000_000);
    expect(quoteAmountMinor("20000000")).toBe(2_000_000_000);
    expect(quoteAmountMinor("20000000.01")).toBeNull();
    expect(quoteAmountMinor("0")).toBeNull();
    expect(quoteAmountMinor("abc")).toBeNull();
    expect(quoteAmountMinor("")).toBeNull();
  });

  it("needs an operator and conditions", () => {
    const result = quoteSchema.safeParse({
      operatorId: "",
      amount: "100",
      conditions: "  ",
    });
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map((issue) => issue.path.join(".")).sort(),
    ).toEqual(["conditions", "operatorId"]);
  });
});
