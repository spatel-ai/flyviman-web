import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats whole rupee amounts with Indian digit grouping", () => {
    expect(formatMoney(52179600, "INR")).toBe("₹5,21,796");
  });

  it("keeps paise when the amount is not whole", () => {
    expect(formatMoney(123456, "INR")).toBe("₹1,234.56");
  });

  it("formats zero", () => {
    expect(formatMoney(0, "INR")).toBe("₹0");
  });

  it("rejects fractional minor units", () => {
    expect(() => formatMoney(10.5, "INR")).toThrow(TypeError);
  });
});
