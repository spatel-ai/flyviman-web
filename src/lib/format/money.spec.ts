import { describe, expect, it } from "vitest";
import { formatMoney, paiseToRupees, rupeesToPaise } from "./money";

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

describe("rupeesToPaise and paiseToRupees", () => {
  it("reads what people type, in rupees, as paise", () => {
    expect(rupeesToPaise("1,80,000")).toBe(18_000_000);
    expect(rupeesToPaise("₹ 2500.5")).toBe(250_050);
    expect(rupeesToPaise("2500.05")).toBe(250_005);
    expect(rupeesToPaise("  ")).toBeNull();
  });

  it("refuses what is not an amount", () => {
    expect(() => rupeesToPaise("abc")).toThrow();
    expect(() => rupeesToPaise("-5")).toThrow();
    expect(() => rupeesToPaise("1.234")).toThrow();
  });

  it("writes paise back as rupees for a form", () => {
    expect(paiseToRupees(18_000_000)).toBe("180000");
    expect(paiseToRupees(250_050)).toBe("2500.5");
    expect(paiseToRupees(250_005)).toBe("2500.05");
    expect(paiseToRupees(null)).toBe("");
  });
});
